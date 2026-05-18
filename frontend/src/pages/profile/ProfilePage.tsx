import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { calendarApi } from '../../api/calendar';
import { User, Mail, Calendar, MapPin, Building2, Phone, Camera, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth';

export default function ProfilePage() {
    const { user, login } = useAuth(); // Assuming login updates user context or we can fetch user again
    const [connecting, setConnecting] = useState(false);

    if (!user) return <div>Loading...</div>;

    const handleConnectCalendar = async () => {
        try {
            setConnecting(true);
            const { url } = await calendarApi.getConnectUrl();
            window.location.href = url;
        } catch (err) {
            console.error(err);
            alert('Failed to initiate calendar connection');
            setConnecting(false);
        }
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            // Assuming authApi has uploadProfilePhoto
            // If not, we might need to add it or implement here.
            // For now, let's just alert if not implemented or try calling it.
            // Based on previous auth.py, we added the endpoint '/profile-photo'
            // We need to check authApi in frontend
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/profile-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const updatedUser = await response.json();
                // Rudimentary way to update context if login function doesn't support partial update
                // Ideally AuthContext exposes a refreshUser() or setUser()
                window.location.reload();
            } else {
                alert('Failed to upload photo');
            }
        } catch (e) {
            console.error(e);
            alert('Error uploading photo');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-primary-900">My Profile</h1>

            <div className="card md:p-8 p-6">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Profile Photo */}
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-primary-100 border-4 border-white shadow-lg">
                            {user.profilePhoto ? (
                                <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${user.profilePhoto}`} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary-300">
                                    <User size={48} />
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full text-white cursor-pointer hover:bg-primary-700 transition-colors shadow-sm">
                            <Camera size={16} />
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        </label>
                    </div>

                    {/* User Details */}
                    <div className="flex-1 space-y-6 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Full Name</label>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <User size={18} className="text-primary-400" />
                                    <span className="font-medium text-primary-900">{user.firstName} {user.lastName}</span>
                                </div>
                            </div>
                            <div>
                                <label className="label">Email Address</label>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <Mail size={18} className="text-primary-400" />
                                    <span className="font-medium text-primary-900">{user.email}</span>
                                </div>
                            </div>
                            <div>
                                <label className="label">Role</label>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${user.role === 'vendor' ? 'bg-purple-100 text-purple-700' :
                                        user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>{user.role}</span>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
}
