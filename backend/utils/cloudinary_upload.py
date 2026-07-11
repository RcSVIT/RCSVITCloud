import cloudinary
import cloudinary.uploader
import os

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

def upload_media(file_bytes, content_type, folder="novichok"):
    size_mb = len(file_bytes) / (1024 * 1024)
    max_size_mb = 10
    if size_mb > max_size_mb:
        raise Exception(f"File too large ({size_mb:.1f} MB). Max is {max_size_mb} MB.")
    if content_type.startswith("video/"):
        resource_type = "video"
    else:
        resource_type = "image"
    try:
        result = cloudinary.uploader.upload(file_bytes, folder=folder, resource_type=resource_type)
        return result["public_id"], result["secure_url"]
    except Exception as e:
        raise Exception(f"Upload failed: {str(e)}")

def upload_image(file_bytes, folder="novichok"):
    return upload_media(file_bytes, "image/jpeg", folder)

def delete_media(public_id, resource_type="image"):
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)

def delete_image(public_id):
    delete_media(public_id, "image")
