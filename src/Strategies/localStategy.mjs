import passport from "passport";
import { Strategy } from "passport-local";
import User from "../Model/User.mjs";
import { comparePassword } from "../utils/PasswordHash.mjs";

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select("-password");
        return user ? done(null, user) : done(null, false);
    } catch (error) {
        return done(error);
    }
});

passport.use(new Strategy({ usernameField: "username", passwordField: "password" }, async (username, password, done) => {
    try {
        const user = await User.findOne({ username }).select("+password");
        if (!user) return done(null, false, { message: "Bad credentials" });
        const valid = await comparePassword(password, user.password);
        if (!valid) return done(null, false, { message: "Bad credentials" });
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

export default passport;
