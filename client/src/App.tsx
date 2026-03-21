import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import InviteCode from './components/auth/InviteCode'
import ChatHome from './components/chat/ChatHome'
import PersonaManager from './components/persona/PersonaManager'
import PersonaCreate from './components/persona/PersonaCreate'
import PersonaDetail from './components/persona/PersonaDetail'
import Wallet from './components/wallet/Wallet'
import Profile from './components/profile/Profile'
import Changelog from './components/common/Changelog'
import SearchPage from './components/common/SearchPage'
import GroupDetail from './components/chat/GroupDetail';
import GroupSettings from './components/chat/GroupSettings';
import JoinRoom from './components/chat/JoinRoom'
import PendingRequests from './components/chat/PendingRequests'
import RoomMembers from './components/chat/RoomMembers'
import RoomSettings from './components/chat/RoomSettings'
import VoiceHall from './components/voice/VoiceHall';
import VoiceRoomDetail from './components/voice/VoiceRoomDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite" element={<InviteCode />} />
        <Route path="/chat" element={<ChatHome />} />
        <Route path="/persona" element={<PersonaManager />} />
        <Route path="/persona/create" element={<PersonaCreate />} />
        <Route path="/persona/:personaId" element={<PersonaDetail />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/group/:roomId" element={<GroupDetail />} />
        <Route path="/group/:roomId/settings" element={<GroupSettings />} />
        <Route path="/join/:roomId" element={<JoinRoom />} />
        <Route path="/voice" element={<VoiceHall />} />
        <Route path="/voice/:roomId" element={<VoiceRoomDetail />} />
        <Route path="/room/:roomId/pending" element={<PendingRequests />} />
        <Route path="/room/:roomId/members" element={<RoomMembers />} />
        <Route path="/room/:roomId/settings" element={<RoomSettings />} />
        <Route path="*" element={<div className="p-8 text-center">404 - 页面不存在</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App