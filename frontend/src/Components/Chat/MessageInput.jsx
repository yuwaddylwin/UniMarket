import { useRef, useState } from "react";
import { Camera, Image, X, Send } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import "./MessageInput.css";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    cameraInputRef.current.value = "";
    galleryInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    await sendMessage({
      text,
      image: imagePreview,
    });

    setText("");
    removeImage();
  };

  return (
    <form className="message-input-container" onSubmit={handleSendMessage}>
      {/* IMAGE PREVIEW */}
      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="preview" />
          <button type="button" onClick={removeImage}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* INPUT BAR */}
      <div className="message-input-row">
        {/* CAMERA (REAL TIME) */}
        <button
          type="button"
          className="icon-btn"
          onClick={() => cameraInputRef.current.click()}
        >
          <Camera size={20} />
        </button>

        <input
          type="text"
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* IMAGE UPLOAD */}
        <button
          type="button"
          className="icon-btn"
          onClick={() => galleryInputRef.current.click()}
        >
          <Image size={20} />
        </button>

        {/* SEND BUTTON */}
        {(text.trim() || imagePreview) && (
          <button type="submit" className="send-btn">
                <Send size={18} />
        </button>
        )}
      </div>

      {/* CAMERA INPUT (REAL-TIME CAMERA) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleImageChange}
      />

      {/* GALLERY INPUT */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageChange}
      />
    </form>
  );
};

export default MessageInput;
