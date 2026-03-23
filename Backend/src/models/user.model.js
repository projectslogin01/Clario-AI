import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// User schema stores only the fields required by the current auth flow.
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        verified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Hash the password before saving so the database never stores plain text passwords.
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare a plain-text password with the saved hash during login.
userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};


const userModel = mongoose.model('User', userSchema);

export default userModel;
