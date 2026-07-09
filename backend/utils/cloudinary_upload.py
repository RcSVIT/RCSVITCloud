import cloudinary
import cloudinary.uploader
import os

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

def upload_file(file, folder="club_media"):
    result = cloudinary.uploader.upload(file, folder=folder, resource_type="auto")
    return {
        "public_id": result["public_id"],
        "url": result["secure_url"],
        "resource_type": result["resource_type"]
    }

def delete_file(public_id, resource_type="image"):
    result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    return result.get("result") == "ok"
