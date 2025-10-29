import { UserInfo } from "@/lib/api/profile";

export default function ProfilePicture({ user, size = 15 }: { user?: UserInfo, size?: number }) {
    if (!user) return;

    return (
        <>
            {user.profile_picture ? (
                <img
                    src={user.profile_picture}
                    alt="Profile"
                    className={`rounded-full min-w-${size} min-h-${size} max-w-${size} max-h-${size} w-${size} h-${size} object-cover`}
                />
            ) : (
                <div className={`rounded-full bg-gradient-to-br from-purple-500 to-purple-700 min-w-${size} min-h-${size} max-w-${size} max-h-${size} w-${size} h-${size} flex items-center justify-center`}>
                    <p className="text-white font-bold text-lg">
                        {user?.full_name ? (
                            user.full_name.trim().split(/\s+/).length > 1
                                ? user.full_name.trim().split(/\s+/)[0][0] + user.full_name.trim().split(/\s+/).slice(-1)[0][0]
                                : user.full_name.at(0)
                        ) : "?"}
                    </p>
                </div>
            )}</>
    )
}