import NavBar from "../components/navBar";
import { getMe } from "../services/auth";
import { patchUserData, patchUserProfileImage } from "../services/user";
import { connectSocket, disconnectSocket, subscribe } from "../services/socket";
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

  useEffect(() => {
      if (!user) return;

      connectSocket(user.userid);

      // Cleanup on unmount only
      return () => {
        disconnectSocket();
      };
    }, [user]); // Only reconnect if userId changes

    

    // ✅ Subscribe to photo likes
    useEffect(() => {
      if (!user) return;

      const unsubscribe = subscribe("photo_liked", (data) => {
        if (data.userid !== user.userid) return;
        // if (data.likedBy == user.username) return;
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
    <div className="min-h-screen bg-gray-100">
      <NavBar />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* ==================== PROFILE HEADER SECTION ==================== */}
        <div className="bg-white shadow rounded p-6 flex items-center space-x-8">
          
          {/* PROFILE IMAGE */}
          <div className="relative">
            <img
              src={
                // If user selected a new image, show preview using blob URL
                profileImageFile
                  ? URL.createObjectURL(profileImageFile)
                  // Otherwise show current profile image or default
                  : user.userProfile || "../../src/assets/ProfileFace.png"
              }
              alt="Profile"
              className="w-36 h-36 rounded-full object-cover border"
            />

            {/* Hidden file input - triggered by button click */}
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

            {/* EDIT/REVERT BUTTON FOR PROFILE IMAGE */}
            <button
              onClick={
                // If user selected a new image, show eraser to revert
                profileImageFile
                  ? revertProfileImage
                  // Otherwise show pencil to upload new image
                  : () => fileInputRef.current?.click()
              }
              className={`absolute bottom-1 border border-gray-300 right-1 p-2 rounded ${
                profileImageFile ? "bg-red-100 text-red-600" : "bg-white"
              }`}
            >
              {profileImageFile ? <Eraser size={12} /> : <Pencil size={12} />}
            </button>
          </div>

          {/* USER INFO */}
          <div className="space-y-2 w-full">
            {/* USERNAME - Now editable */}
            <div className="relative">
              {editingUsername ? (
                <input
                  value={tempUsername}
                  onChange={(e) => updateUsername(e.target.value)}
                  className="text-2xl font-semibold border p-2 rounded w-full"
                  placeholder="Username"
                />
              ) : (
                <h1 className="text-2xl font-semibold">{tempUsername}</h1>
              )}
              
              {/* EDIT/REVERT BUTTON FOR USERNAME */}
              <button
                onClick={editingUsername ? revertUsername : startEditingUsername}
                className={`absolute -top-1 -right-1 p-2 rounded border border-gray-300 ${
                  editingUsername ? "bg-red-100 text-red-600" : "bg-white"
                }`}
              >
                {editingUsername ? <Eraser size={14} /> : <Pencil size={14} />}
              </button>
            </div>
            
            {/* EMAIL - Non-editable */}
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* ==================== BIO SECTION (multiline) ==================== */}
        <EditableInput
          label="About"
          field="userbio"
          value={editData.userbio}
          editingField={editingField}
          onEdit={setEditingField}
          onChange={updateField}
          onRevert={revertField}
          multiline // Shows textarea instead of input
        />

        {/* ==================== OTHER FIELDS (grid layout) ==================== */}
        <div className="grid grid-cols-2 gap-6">
          <EditableInput
            label="Enrollment No"
            field="enrollmentNo"
            value={editData.enrollmentNo}
            {...editableProps} // Spread all the common props
          />
          <EditableInput
            label="Department"
            field="dept"
            value={editData.dept}
            {...editableProps}
          />
          <EditableInput
            label="Batch"
            field="batch"
            value={editData.batch}
            {...editableProps}
          />
        </div>
      </div>

      {/* ==================== SAVE/DISCARD BUTTONS (fixed bottom-right) ==================== */}
      {/* Only show if there are unsaved changes */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 flex gap-3">
          {/* DISCARD BUTTON - reverts all changes */}
          <button
            onClick={discardChanges}
            className="bg-gray-200 px-4 py-2 rounded flex items-center gap-2"
          >
            <X size={16} /> Discard
          </button>
          
          {/* SAVE BUTTON - saves all changes to server */}
          <button
            onClick={saveChanges}
            className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Save size={16} /> Save
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