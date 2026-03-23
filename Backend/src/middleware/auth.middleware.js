import jwt from "jsonwebtoken";

/**
 * Protects private routes by reading the signed auth token from cookies.
 * When valid, the decoded payload is attached to `req.user`.
 */
export function authUser(req,res,next){
    const token = req.cookies.token;
    if(!token){
        return res.status(401).json({
            message: "Unauthorized",
            success: false,
            err: "No token provided"
        })
    }

    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET);

        req.user = decoded;

        next();
    }catch(err){
        return res.status(401).json({
            message: "Unauthorized",
            success: false,
            err: "Invalid token"
        })
    }
}
