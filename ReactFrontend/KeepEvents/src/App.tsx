// src/App.tsx
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/StartingPage";
import Login from "./pages/login";
import Register from "./pages/register";
import HomePage from "./pages/homePage";
import EventPhotos from "./pages/eventPhotos";
import CreateEvent from "./pages/createEvent";
import { Toaster } from "react-hot-toast";
import MyActivityPage from "./pages/MyActivityPage";
import MyInfoPage from "./pages/MyInfoPage";
import EventsPage from "./pages/EventsPage";
import PhotosPage from "./pages/PhotosPage";
import AcceptInvite from "./pages/AcceptInvite";
import { WebSocketProvider } from "./contexts/WebSocketContext";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      {/* Wrap everything in WebSocketProvider */}
      <WebSocketProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/HomePage" element={<HomePage />} />
          <Route path="/Events/:eventId" element={<EventPhotos />} />
          <Route path="EventsCreate" element={<CreateEvent />} />
          <Route path="/Activity" element={<MyActivityPage />} />
          <Route path="/Profile" element={<MyInfoPage />} />
          <Route path="/Events" element={<EventsPage />} />
          <Route path="/Photos" element={<PhotosPage />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
        </Routes>
      </WebSocketProvider>
    </>
  );
}

export default App;