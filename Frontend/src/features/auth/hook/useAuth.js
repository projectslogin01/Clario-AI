import  { useDispatch } from "react-redux";
import { login,register,getme } from "../service/auth.api";
import { setUser,setError,setLoading } from "../auth.slice";


export function useAuth(){
    const dispatch = useDispatch();

    async function handleRegister({email,username,password}) {
        try{
            dispatch(setLoading(true))
            const data = await register({email,username,password})
        }catch(error){
            dispatch(setError(error.response?.data?.message || "Registration failed"))
        }finally{
            dispatch(setLoading(false))
        }
    }

    async function handleLogin({email,password}) {
        try{
            dispatch(setLoading(true))
            const data = await login({email,password})
            dispatch(setUser(data.user))
        }catch(error){
            dispatch(setError(error.response?.data?.message || "Login failed"))
        }finally{
            dispatch(setLoading(false))
        }
    }

    async function handleGetme() {
        try{
            dispatch(setLoading(true))
            const data = await getme()
            dispatch(setUser(data.user))
        }catch(error){
            dispatch(setError(error.response?.data?.message || "Failed to fetch user data"))
        }finally{
            dispatch(setLoading(false))
        }
    }

    return{handleGetme,handleLogin,handleRegister}
}