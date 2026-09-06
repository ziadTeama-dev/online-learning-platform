import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email, token) => {
    const verificationUrl =
        `${process.env.FRONTEND_URL}/api/user/auth/verify-email?token=${token}`;

    const { data, error } = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: ["learnfyplatform@gmail.com"],
        subject: "Verify your Learnfy account",

        html: `
            <h2>Welcome to Learnfy 🎓</h2>

            <p>
                Please click the button below to verify your email.
            </p>

            <a
                href="${verificationUrl}"
                style="
                    display:inline-block;
                    padding:12px 20px;
                    background:#000;
                    color:#fff;
                    text-decoration:none;
                    border-radius:6px;
                "
            >
                Verify Email
            </a>

            <p>
                This link will expire in 30 minutes.
            </p>
        `
    });

    if (error) {
      console.log(error)
        throw new Error(error.message);
    }

    return data;
};