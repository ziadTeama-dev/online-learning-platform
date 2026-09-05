import User from "../Model/User.mjs";

const safeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role
});

export const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // The public admin API can grant/revoke teacher status only.
        // Admin creation is intentionally kept out of the HTTP API.
        if (!["student", "teacher"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be student or teacher"
            });
        }

        const user = await User.findById(id).select("_id username email phone role");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator roles cannot be changed through this endpoint"
            });
        }

        user.role = role;
        await user.save();

        return res.status(200).json({
            success: true,
            message: `User role changed to ${role}`,
            data: safeUser(user)
        });
    } catch (error) {
        next(error);
    }
};
