from flask import Flask, jsonify, redirect
from flask_cors import CORS, cross_origin
import subprocess
import os
import logging
from pathlib import Path
import tempfile
import time
import re
import firebase_admin
from firebase_admin import credentials, storage
import shutil

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})


# Initialize Firebase Admin SDK
cred = credentials.Certificate('./firebase_key.json')
firebase_admin.initialize_app(cred, {
    'storageBucket': 'plants-in-space.firebasestorage.app'
})
bucket = storage.bucket()

def is_valid_spotify_id(track_id):
    """Validate Spotify track ID format."""
    track_id = track_id.split('?')[0]
    return bool(re.match(r'^[0-9A-Za-z]{22}$', track_id))

def check_firebase_storage(track_id):
    """
    Check if the track exists in Firebase Storage.
    Returns (exists, download_url)
    """
    try:
        blob = bucket.blob(f'music/{track_id}.mp3')
        
        if blob.exists():
            url = blob.generate_signed_url(
                expiration=3600,  # 1 hour
                version="v4"
            )
            return True, url
        return False, None
    except Exception as e:
        logger.error(f"Firebase storage check error: {str(e)}")
        return False, None

def process_track(track_id):
    """
    Downloads track and uploads to Firebase using a temporary directory.
    Returns (success, url_or_error_message)
    """
    # Create a temporary directory within /app/temp
    temp_dir = os.path.join('/app/temp', str(time.time()))
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        spotify_url = f"https://open.spotify.com/track/{track_id}"
        
        # Download using spotify-dl
        command = [
            "spotify_dl",
            "-l", spotify_url,
            "-o", temp_dir,
            "-f", "mp3",
            "-s", "y"
        ]
        
        # Set current working directory to temp_dir
        os.chdir(temp_dir)
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            return False, f"Download failed: {result.stderr}"
        
        # Wait briefly for file to be completely written
        time.sleep(2)
        
        # Find the downloaded file
        downloaded_files = list(Path(temp_dir).rglob("*.mp3"))
        if not downloaded_files:
            return False, "No files downloaded"
        
        file_path = str(downloaded_files[0])
        
        # Upload to Firebase
        try:
            blob = bucket.blob(f'music/{track_id}.mp3')
            blob.upload_from_filename(file_path)
            
            # Get the download URL
            url = blob.generate_signed_url(
                expiration=3600,
                version="v4"
            )
            return True, url
            
        except Exception as e:
            return False, f"Firebase upload error: {str(e)}"
            
    except subprocess.TimeoutExpired:
        return False, "Download timed out"
    except Exception as e:
        return False, f"Error during processing: {str(e)}"
    finally:
        # Clean up temporary directory
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception as e:
            logger.error(f"Error cleaning up temp directory: {str(e)}")
        # Change back to app directory
        os.chdir('/app')

@app.route('/download/<track_id>')
@cross_origin()
def download_spotify_track(track_id):
    """
    Endpoint to download a Spotify track.
    Returns the Firebase Storage URL instead of redirecting.
    """
    if not is_valid_spotify_id(track_id):
        return jsonify({
            'error': 'Invalid Spotify track ID format'
        }), 400
    
    # First check Firebase Storage
    exists, firebase_url = check_firebase_storage(track_id)
    if exists:
        logger.info(f"Track {track_id} found in Firebase Storage")
        return jsonify({
            'url': firebase_url,
            'cached': True
        })
    
    # If not in Firebase, process the track
    logger.info(f"Track {track_id} not found in Firebase, downloading...")
    success, result = process_track(track_id)
    
    if success:
        return jsonify({
            'url': result,
            'cached': False
        })
    else:
        return jsonify({
            'error': result
        }), 500

@app.errorhandler(404)
@cross_origin()
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.route('/download/<track_id>', methods=['OPTIONS'])
@cross_origin()
def options_handler(track_id):
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
    return response

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
