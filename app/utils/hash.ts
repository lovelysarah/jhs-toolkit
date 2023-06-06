import bcrypt from "bcryptjs";
// Used for hashing passwords
export const generateHash = async (password: string) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};
