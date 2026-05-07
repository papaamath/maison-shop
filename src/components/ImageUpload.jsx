import { useState } from "react";

export default function ImageUpload({ onUpload, imageActuelle }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(imageActuelle || "");

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image trop lourde. Maximum 5MB.");
      return;
    }

    // Prévisualisation locale immédiate
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload vers Cloudinary
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "maison-shop/produits");

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data.secure_url) {
        setPreview(data.secure_url);
        onUpload(data.secure_url);
      } else {
        alert("Erreur upload. Réessayez.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion.");
    }
    setUploading(false);
    setProgress(0);
  }

  return (
    <div>
      <label className="text-sm text-gray-500 block mb-1">Image du produit</label>

      <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
        uploading ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-400"
      }`}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <div>
            <p className="text-blue-500 font-medium mb-2">Upload en cours...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4" />
            </div>
            <p className="text-xs text-gray-400 mt-2">Envoi vers Cloudinary...</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">📷</p>
            <p className="text-sm text-gray-500">Clique pour choisir une image</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5MB</p>
          </div>
        )}
      </label>

      {preview && !uploading && (
        <div className="mt-3 relative inline-block">
          <img
            src={preview}
            alt="Prévisualisation"
            className="h-32 w-32 object-cover rounded-xl border border-gray-200"
          />
          <button
            type="button"
            onClick={() => { setPreview(""); onUpload(""); }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}