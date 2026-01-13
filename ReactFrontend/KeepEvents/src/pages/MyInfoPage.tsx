import NavBar from "../components/navBar";
import { getMe } from "../services/auth";
import { patchUserData, patchUserProfileImage } from "../services/user";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useEffect, useRef, useState } from "react";
import type { User, EditedData } from "../types/user";
import { Pencil, Eraser, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
function MyInfoPage() {

    const navigate = useNavigate();
  // ==================== STATE MANAGEMENT ====================
  // `user` - Original data from database (source of truth)
  const [user, setUser] = useState<User | null>(null);
  
  // `editData` - Temporary edits user is making (not saved yet)
  const [editData, setEditData] = useState<EditedData>({});
  
  // `editingUsername` - Is username field being edited? (separate from other fields)
  const [editingUsername, setEditingUsername] = useState(false);
  
  // `tempUsername` - Temporary username value while editing
  const [tempUsername, setTempUsername] = useState("");
  
  // `editingField` - Which field is currently in edit mode (shows input instead of text)
  const [editingField, setEditingField] = useState<keyof EditedData | null>(null);
  
  // `hasChanges` - Are there unsaved changes? (shows Save/Discard buttons)
  const [hasChanges, setHasChanges] = useState(false);
  
  // `loading` - Is data still being fetched?
  const [loading, setLoading] = useState(true);
  
  // `profileImageFile` - New profile image file selected by user (before upload)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // Reference to the hidden file input element (for profile image upload)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== LOAD USER DATA ON MOUNT ====================
  useEffect(() => {
    const load = async () => {
      try {
        // Fetch current user data from API
        const data = await getMe();
        
        // Store original user data (never changes until saved)
        setUser(data.user);
        
        // Initialize tempUsername with current username
        setTempUsername(data.user.username);
        
        // Initialize editData with the same values (user can modify these)
        setEditData({
          userbio: data.user.userbio,
          enrollmentNo: data.user.enrollmentNo,
          dept: data.user.dept,
          batch: data.user.batch,
        });
      } catch {
        // If not authenticated, redirect to login
            navigate("/");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // Empty dependency array = run only once on mount


  // ==================== WEBSOCKET SUBSCRIPTIONS ====================
  const { subscribe } = useWebSocket();
    // ✅ Subscribe to photo likes
    useEffect(() => {
      if (!user) return;

      const unsubscribe = subscribe("photo_liked", (data) => {
        if (data.userid !== user.userid) return;
        if (data.likedById == user.userid) return;
        toast.success(`${data.likedBy  } liked your photo`);
    
      });

      return () => {
        unsubscribe();
      };
    } , [user?.userid]); // Only resubscribe if userId changes

   useEffect(() => {
        if (!user) return;
  
        const unsubscribe = subscribe("comment_added", (data) => {
          if (data.userid !== user.userid) return;
          if (data.commentedBy == user.username) return;
          toast.success(`${data.commentedBy  } commented ${data.comment}`);
        });
  
        return () => {  
          unsubscribe();
        };
      } , [user?.userid]); // Only resubscribe if userId changes

  // ==================== UPDATE A SINGLE FIELD ====================
  // Called when user types in an input field
  const updateField = (field: keyof EditedData, value: any) => {
    // Update only the specific field that changed
    setEditData(prev => ({ ...prev, [field]: value }));
    
    // Mark that there are unsaved changes (shows Save/Discard buttons)
    setHasChanges(true);
  };

  // ==================== PROFILE IMAGE SELECTION ====================
  // Called when user selects a new profile image
  const onProfileImageSelect = (file: File) => {
    setProfileImageFile(file); // Store the file (not uploaded yet)
    setHasChanges(true);        // Mark as having unsaved changes
  };

  // ==================== REVERT A SINGLE FIELD ====================
  // Called when user clicks the "eraser" icon on a field
  // Restores the original value from `user` (before editing)
  const revertField = (field: keyof EditedData) => {
    if (!user) return;
    
    // Reset this field to its original value from database
    setEditData(prev => ({ ...prev, [field]: user[field] }));
    
    // Exit edit mode for this field
    setEditingField(null);
  };

  // ==================== REVERT PROFILE IMAGE ====================
  // Called when user clicks the "eraser" icon on profile image
  const revertProfileImage = () => {
    setProfileImageFile(null); // Remove the selected file
    
    // Check if there are any other unsaved changes in text fields or username
    const hasTextChanges = Object.keys(editData).some(
      key => editData[key as keyof EditedData] !== user?.[key as keyof User]
    );
    const hasUsernameChange = tempUsername !== user?.username;
    
    setHasChanges(hasTextChanges || hasUsernameChange);
  };

  // ==================== START EDITING USERNAME ====================
  const startEditingUsername = () => {
    setEditingUsername(true);
  };

  // ==================== REVERT USERNAME ====================
  const revertUsername = () => {
    if (!user) return;
    setTempUsername(user.username); // Reset to original username
    setEditingUsername(false);
  };

  // ==================== UPDATE USERNAME ====================
  const updateUsername = (value: string) => {
    setTempUsername(value);
    setHasChanges(true);
  };

  // ==================== DISCARD ALL CHANGES ====================
  // Called when user clicks "Discard" button
  // Reverts ALL fields to original values
  const discardChanges = () => {
    if (!user) return;
    
    // Reset username to original
    setTempUsername(user.username);
    setEditingUsername(false);
    
    // Reset all fields to original database values
    setEditData({
      userbio: user.userbio,
      enrollmentNo: user.enrollmentNo,
      dept: user.dept,
      batch: user.batch,
    });
    
    // Remove any new profile image selection
    setProfileImageFile(null);
    
    // Exit edit mode
    setEditingField(null);
    
    // Hide Save/Discard buttons
    setHasChanges(false);
  };

  // ==================== SAVE ALL CHANGES ====================
  // Called when user clicks "Save" button
  // Sends changes to the server
  const saveChanges = async () => {
    if (!user) return;

    try {
      // STEP 1: Upload new profile image if user selected one
      if (profileImageFile) {
        await patchUserProfileImage(user.userid, profileImageFile);
      }

      // STEP 2: Save text data (username, bio, enrollment, dept, batch)
      // Note: You'll need to update your patchUserData to accept username
      const dataToSave = {
        ...editData,
        ...(tempUsername !== user.username && { username: tempUsername })
      };
      const res = await patchUserData(user.userid, dataToSave);

      // STEP 3: Update `user` with the response from server (new source of truth)
      setUser(res);
      
      // STEP 4: Sync `tempUsername` with saved data
      setTempUsername(res.username);
      setEditingUsername(false);
      
      // STEP 5: Sync `editData` with saved data
      setEditData({
        userbio: res.userbio,
        enrollmentNo: res.enrollmentNo,
        dept: res.dept,
        batch: res.batch,
      });
      
      // STEP 6: Clear temporary profile image file
      setProfileImageFile(null);
      
      // STEP 7: Exit edit mode
      setEditingField(null);
      
      // STEP 8: Hide Save/Discard buttons (no more unsaved changes)
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    }
  };

  // ==================== LOADING STATE ====================
 if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          {/* Changed spinner to Tea Green */}
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#aaff99] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Loading Profile...</p>
        </div>
      </div>
    );
  }

  // ==================== NO USER DATA ====================
  if (!user) return null;

  // ==================== PROPS FOR EDITABLE INPUTS ====================
  const editableProps = {
    editingField,
    onEdit: setEditingField,
    onChange: updateField,
    onRevert: revertField,
  };

  // ==================== RENDER UI ====================
  return (
    <div className="relative min-h-screen w-full bg-white font-sans overflow-hidden">
      
      {/* --- Background Aesthetics --- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(60px, -50px) scale(1.1); }
          66% { transform: translate(-40px, 40px) scale(0.9); }
        }
        @keyframes shine {
          100% { left: 125%; }
        }
        .animate-float-1 { animation: float 20s infinite ease-in-out; }
        .animate-float-2 { animation: float 25s infinite ease-in-out -5s; }
        .animate-shine { animation: shine 2s infinite; }
        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 34px 34px;
        }
      `}</style>

      <div className="absolute inset-0 bg-dot-pattern opacity-50 z-0 pointer-events-none" />
      
      {/* Colorful Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-25 animate-float-1 pointer-events-none" style={{ backgroundColor: '#ff9999' }} /> 
      {/* ^ Powder Blush */}
      <div className="absolute bottom-[-10%] left-[-5%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-25 animate-float-2 pointer-events-none" style={{ backgroundColor: '#aaff99' }} />
      {/* ^ Tea Green */}

      <div className="relative z-10">
        <NavBar />

        <div className="max-w-4xl mx-auto p-6 space-y-8 pt-12 pb-32">
          
          {/* ==================== PROFILE HEADER CARD ==================== */}
          <div className="bg-white/60 backdrop-blur-3xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/80 p-10 flex flex-col sm:flex-row items-center space-y-8 sm:space-y-0 sm:space-x-12">
            
            {/* PROFILE IMAGE */}
            <div className="relative group">
              <div className="w-44 h-44 rounded-full border-4 border-white shadow-2xl shadow-green-900/5 overflow-hidden relative z-10">
                <img
                  src={
                    profileImageFile
                      ? URL.createObjectURL(profileImageFile)
                      : user.userProfile || "../../src/assets/ProfileFace.png"
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onProfileImageSelect(e.target.files[0]);
                  }
                }}
              />

              {/* EDIT/REVERT BUTTON */}
              {/* Uses Electric Aqua (#99f7ff) for Edit, Powder Blush (#ff9999) for Revert */}
              <button
                onClick={
                  profileImageFile
                    ? revertProfileImage
                    : () => fileInputRef.current?.click()
                }
                className={`absolute bottom-2 right-2 z-20 p-3.5 rounded-2xl border-2 border-white shadow-xl transition-all active:scale-95 group-hover:scale-110 ${
                  profileImageFile 
                    ? "bg-[#ff9999] text-[#550000] rotate-12" 
                    : "bg-[#99f7ff] text-[#004d4d] hover:bg-[#7cefff]"
                }`}
              >
                {profileImageFile ? <Eraser size={20} /> : <Pencil size={20} />}
              </button>
            </div>

            {/* USER INFO */}
            <div className="space-y-3 w-full text-center sm:text-left">
              <div className="relative inline-block w-full">
                 {/* Identity Label in Pink */}
                 <span className="text-[#ff9999] font-black text-[10px] uppercase tracking-[0.3em] block mb-2">
                   Identity
                 </span>
                
                {editingUsername ? (
                  <div className="relative">
                    <input
                      value={tempUsername}
                      onChange={(e) => updateUsername(e.target.value)}
                      className="text-4xl font-black text-slate-900 border-b-2 border-[#aaff99] pb-1 w-full bg-transparent outline-none tracking-tight"
                      placeholder="Username"
                      autoFocus
                    />
                  </div>
                ) : (
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter">{tempUsername}</h1>
                )}
                
                <button
                  onClick={editingUsername ? revertUsername : startEditingUsername}
                  className={`absolute top-0 right-0 p-2.5 rounded-xl transition-all ${
                    editingUsername 
                      ? "bg-red-50 text-red-500 hover:bg-red-100" 
                      : "bg-[#f0fdf4] text-[#aaff99] hover:text-[#77cc66]" // Greenish tint
                  }`}
                >
                  {editingUsername ? <Eraser size={16} /> : <Pencil size={16} />}
                </button>
              </div>
              
              <div className="inline-block px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* ==================== BIO SECTION ==================== */}
          <div className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white p-2 shadow-sm group">
              <EditableInput
                label="Biography"
                field="userbio"
                value={editData.userbio}
                editingField={editingField}
                onEdit={setEditingField}
                onChange={updateField}
                onRevert={revertField}
                multiline 
                className="text-slate-700" 
              />
          </div>

          {/* ==================== OTHER FIELDS GRID ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white p-2 shadow-sm transition-shadow hover:shadow-md">
              <EditableInput
                  label="Enrollment No"
                  field="enrollmentNo"
                  value={editData.enrollmentNo}
                  {...editableProps}
              />
            </div>
            <div className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white p-2 shadow-sm transition-shadow hover:shadow-md">
              <EditableInput
                  label="Department"
                  field="dept"
                  value={editData.dept}
                  {...editableProps}
              />
            </div>
            <div className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white p-2 shadow-sm transition-shadow hover:shadow-md md:col-span-2">
              <EditableInput
                  label="Academic Batch"
                  field="batch"
                  value={editData.batch}
                  {...editableProps}
              />
            </div>
          </div>
        </div>

        {/* ==================== FLOATING ACTION BAR ==================== */}
        {hasChanges && (
          <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 animate-in slide-in-from-bottom-6 duration-500">
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-2 rounded-full shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] flex items-center gap-2">
              
              {/* DISCARD: Soft Pink Text */}
              <button
                onClick={discardChanges}
                className="px-6 py-4 rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#ff9999] hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <X size={16} /> <span className="hidden sm:inline">Discard</span>
              </button>
              
              <div className="w-px h-8 bg-slate-100" />
              
              {/* SAVE: Tea Green Background with Dark Green Text */}
              <button
                onClick={saveChanges}
                className="group relative px-8 py-4 bg-[#aaff99] text-[#003300] rounded-full flex items-center gap-2 overflow-hidden shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5 transition-all"
              >
                <span className="relative z-10 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Save size={16} /> Save Changes
                </span>
                {/* Shiny effect overlay */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/40 group-hover:animate-shine" />
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyInfoPage;

/* ================= REUSABLE COMPONENTS ================= */

/**
 * FieldIcon Component
 * Shows pencil icon (edit mode) or eraser icon (revert)
 * 
 * @param editing - Is this field currently being edited?
 * @param onEdit - Function to call when pencil is clicked
 * @param onRevert - Function to call when eraser is clicked
 */
function FieldIcon({ editing, onEdit, onRevert }: any) {
  return (
    <button
      // Click handler: revert if editing, otherwise start editing
      onClick={editing ? onRevert : onEdit}
      className={`absolute bottom-1 border border-gray-300 right-1 p-2 rounded ${
        editing ? "bg-red-100 text-red-600" : "bg-white"
      }`}
    >
      {/* Show eraser in edit mode, pencil otherwise */}
      {editing ? <Eraser size={12} /> : <Pencil size={12} />}
    </button>
  );
}

/**
 * EditableInput Component
 * A field that can toggle between display mode and edit mode
 * 
 * @param label - Label text above the field (e.g. "Department")
 * @param field - Which field this is (e.g. "dept")
 * @param value - Current value of the field
 * @param editingField - Which field is currently being edited (global state)
 * @param onEdit - Function to start editing this field
 * @param onChange - Function to update field value
 * @param onRevert - Function to cancel editing and revert to original
 * @param multiline - If true, shows textarea instead of input
 */
function EditableInput({
  label,
  field,
  value,
  editingField,
  onEdit,
  onChange,
  onRevert,
  multiline = false,
}: any) {
  // Check if THIS specific field is currently being edited
  const isEditing = editingField === field;

  return (
    <div className="relative bg-white shadow rounded p-6">
      {/* FIELD LABEL */}
      <p className="text-sm text-gray-500">{label}</p>
      
      {/* CONDITIONAL RENDERING: input vs display */}
      {isEditing ? (
        // EDIT MODE: Show input or textarea
        multiline ? (
          <textarea
            value={value ?? ""} // Show empty string if value is null
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full border p-2 rounded mt-1"
            rows={4}
          />
        ) : (
          <input
            value={value ?? ""} // Show empty string if value is null
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full border p-2 rounded mt-1"
          />
        )
      ) : (
        // DISPLAY MODE: Show plain text
        <p className="font-medium mt-1">{value ?? "Empty"}</p>
      )}
      
      {/* EDIT/REVERT ICON BUTTON */}
      <FieldIcon
        editing={isEditing}
        onEdit={() => onEdit(field)}   // Start editing this field
        onRevert={() => onRevert(field)} // Cancel editing and revert
      />
    </div>
  );
}