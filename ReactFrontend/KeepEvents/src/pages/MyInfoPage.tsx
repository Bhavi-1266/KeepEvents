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
        if (data.likedBy == user.username) return;
        toast.success(`${data.likedBy  } liked your photo`);
    
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
      <>
        <NavBar />
        <p className="p-6">Loading profile...</p>
      </>
    );
  }

  // ==================== NO USER DATA ====================
  if (!user) return null;

  // ==================== PROPS FOR EDITABLE INPUTS ====================
  // These props are passed to all EditableInput components
  const editableProps = {
    editingField,           // Which field is currently being edited
    onEdit: setEditingField, // Function to start editing a field
    onChange: updateField,   // Function to update field value
    onRevert: revertField,   // Function to cancel editing a field
  };

  // ==================== RENDER UI ====================
  return (
    <div className="min-h-screen bg-[#fefae0]/30 font-sans text-[#283618]">
      <NavBar />

      <div className="max-w-4xl mx-auto p-6 space-y-8 pt-12">
        
        {/* ==================== PROFILE HEADER SECTION ==================== */}
        <div className="bg-white rounded-xl shadow-xl shadow-[#283618]/5 border border-[#dda15e]/20 p-8 flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-10">
          
          {/* PROFILE IMAGE */}
          <div className="relative group">
            <div className="w-40 h-40 rounded-full border-4 border-[#fefae0] shadow-lg overflow-hidden ring-1 ring-[#606c38]/20">
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
            <button
              onClick={
                profileImageFile
                  ? revertProfileImage
                  : () => fileInputRef.current?.click()
              }
              className={`absolute bottom-2 right-2 p-2.5 rounded-lg border-2 shadow-md transition-all active:scale-95 ${
                profileImageFile 
                  ? "bg-red-500 border-red-600 text-white hover:bg-red-700" 
                  : "bg-[#bc6c25] border-[#bc6c25] text-white hover:bg-[#283618]"
              }`}
            >
              {profileImageFile ? <Eraser size={16} /> : <Pencil size={16} />}
            </button>
          </div>

          {/* USER INFO */}
          <div className="space-y-4 w-full text-center sm:text-left">
            <div className="relative inline-block w-full">
               <span className="text-[#bc6c25] font-black text-[10px] uppercase tracking-[0.3em] block mb-1">Identity</span>
              {editingUsername ? (
                <input
                  value={tempUsername}
                  onChange={(e) => updateUsername(e.target.value)}
                  className="text-2xl font-black border-2 border-[#bc6c25] p-2 rounded-lg w-full bg-[#fefae0]/50 outline-none uppercase tracking-tighter"
                  placeholder="Username"
                />
              ) : (
                <h1 className="text-4xl font-black text-[#283618] tracking-tighter uppercase">{tempUsername}</h1>
              )}
              
              <button
                onClick={editingUsername ? revertUsername : startEditingUsername}
                className={`absolute top-0 right-0 p-2 rounded-lg border-2 transition-all ${
                  editingUsername 
                    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                    : "bg-white border-[#606c38]/10 text-[#606c38] hover:border-[#bc6c25]"
                }`}
              >
                {editingUsername ? <Eraser size={14} /> : <Pencil size={14} />}
              </button>
            </div>
            
            <p className="text-[#606c38] font-bold text-xs uppercase tracking-[0.2em] bg-[#606c38]/5 inline-block px-3 py-1 rounded-full">
              {user.email}
            </p>
          </div>
        </div>

        {/* ==================== BIO SECTION ==================== */}
        <div className="bg-white rounded-xl border border-[#dda15e]/20 p-1 shadow-sm">
            <EditableInput
              label="Biography"
              field="userbio"
              value={editData.userbio}
              editingField={editingField}
              onEdit={setEditingField}
              onChange={updateField}
              onRevert={revertField}
              multiline 
            />
        </div>

        {/* ==================== OTHER FIELDS ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-[#dda15e]/20 p-1">
            <EditableInput
                label="Enrollment No"
                field="enrollmentNo"
                value={editData.enrollmentNo}
                {...editableProps}
            />
          </div>
          <div className="bg-white rounded-xl border border-[#dda15e]/20 p-1">
            <EditableInput
                label="Department"
                field="dept"
                value={editData.dept}
                {...editableProps}
            />
          </div>
          <div className="bg-white rounded-xl border border-[#dda15e]/20 p-1 md:col-span-2">
            <EditableInput
                label="Academic Batch"
                field="batch"
                value={editData.batch}
                {...editableProps}
            />
          </div>
        </div>
      </div>

      {/* ==================== SAVE/DISCARD BUTTONS ==================== */}
      {hasChanges && (
        <div className="fixed bottom-8 right-8 flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={discardChanges}
            className="bg-white border-2 border-[#606c38]/20 px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#606c38] hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all shadow-lg"
          >
            <X size={16} /> Discard Changes
          </button>
          
          <button
            onClick={saveChanges}
            className="bg-[#283618] border-2 border-[#283618] px-10 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#fefae0] hover:bg-[#bc6c25] hover:border-[#bc6c25] transition-all shadow-lg shadow-[#283618]/20"
          >
            <Save size={16} /> Synchronize Profile
          </button>
        </div>
      )}
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