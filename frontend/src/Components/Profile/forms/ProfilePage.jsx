export default function ProfilePage(){
    return(
        <h1>This is the profile page!</h1>
    )
}




// export default function ProfilePage() {
//   const { authUser, isUpdatingProfile, updateProfile, logout } = useAuthStore();
//   const [selectedImg, setSelectedImg] = useState(null);

//   const handleImageUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.readAsDataURL(file);

//     reader.onload = async () => {
//       const base64Image = reader.result;
//       setSelectedImg(base64Image);
//       await updateProfile({ profilePic: base64Image });
//     };
//   };
