import { create } from "zustand"
import { axiosInstance } from "../lib/axios.js"
import toast from "react-hot-toast";
import { io } from "socket.io-client";


export const useAuthStore = create((set, get) => ({
    authUser: null,   //default user state is null 
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false, //just multiple global  states to hande it properly 
    onlineUsers: [],
    isCheckingAuth: true, // loader to check if user is logged in or not 
    socket: null,

    //checking user is loged in or not function via backend 
    checkAuth: async () => {

        try {
            const res = await axiosInstance.get("/auth/check-auth")
            // console.log("resposnse check auth", res);

            set({ authUser: res.data }) // changing state to token from null if it send token in response
            get().connectSocket()

        } catch (error) {
            console.log("error ", error.response?.data?.message);

            set({ authUser: null }) // changing state to null if it crashes
            // console.log("authUser", useAuthStore.getState().authUser);

        } finally {
            set({ isCheckingAuth: false }) //changing loader to false 
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true }) //updating loadig state to true while the data is being processed
        try {
            const res = await axiosInstance.post('/auth/signup', data)
            set({ authUser: res.data });
            toast.success(res.data.message)

            // getting the check auth state and calling the function to update and check the cookie
            await useAuthStore.getState().checkAuth()
            get().connectSocket()

            return true
        } catch (error) {
            toast.error(error?.response?.data?.message)
            return false

        } finally {
            set({ isSigningUp: false }) //updating loading state to false

        }


    },

    logIn: async (data) => {
        set({ isLoggingIn: true })
        try {
            const res = await axiosInstance.post("/auth/login", data)
            // console.log("response success", res.data);

            toast.success(res.data.message)

            // getting the check auth state and calling the function to update and check the cookie before redirecting to home page 
            await useAuthStore.getState().checkAuth()

            get().connectSocket()

            return true
        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message)
            return false
        } finally {
            set({ isLoggingIn: false })

        }



    },

    logout: async () => {
        try {
            const res = await axiosInstance.post("/auth/logout")
            toast.success(res.data.message)
            set({ authUser: null })
            get().disconnectSocket()
        } catch (error) {
            toast.error(error.response.data.message)

        } finally {
        }

    },

    updateProfile: async (data) => {

        set({ isUpdatingProfile: true })
        try {
            const res = await axiosInstance.put("/auth/update-profile", data)
            // console.log("res" , res.data);
            toast.success("image updated succesfully")
            set({ authUser: res.data })
            await useAuthStore.getState().checkAuth()




        } catch (error) {
            toast.error(error.response.data.message)

            console.log("error", error);


        } finally {
            set({ isUpdatingProfile: false })

        }


    },
    connectSocket: () => {
        const { authUser, socket } = get();

        // ✅ Validate user
        if (!authUser?.data?._id) return;

        // ✅ Prevent double connection
        if (socket && socket.connected) return;

        // Get socket URL - use dedicated env var or derive from API URL
        let socketUrl = import.meta.env.VITE_REACT_APP_SOCKET_URL;

        // If SOCKET_URL not set, derive from API URL (remove /api if present)
        if (!socketUrl) {
            const apiUrl = import.meta.env.VITE_REACT_APP_URL || '';
            socketUrl = apiUrl.replace(/\/api\/?$/, ''); // Remove /api from end
        }

        if (!socketUrl) {
            console.error('❌ Socket URL not configured. Set VITE_REACT_APP_SOCKET_URL or VITE_REACT_APP_URL');
            return;
        }

        console.log('🔌 Connecting to socket:', socketUrl);

        // 🔒 Use full production URL with websocket-only transport
        const newSocket = io(socketUrl, {
            query: { userId: authUser.data._id },
            transports: ["websocket"], // 🔥 Force websocket to avoid fallback issues
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        set({ socket: newSocket });

        newSocket.on("connect", () => {
            console.log("✅ Socket connected:", newSocket.id);
        });

        newSocket.on("connect_error", (error) => {
            console.error("❌ Socket connection error:", error.message);
        });

        newSocket.on("getOnlineUsers", (userIds) => {
            console.log("📡 Online users:", userIds);
            set({ onlineUsers: userIds });
        });

        newSocket.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected:", reason);
        });
    },

    disconnectSocket: () => {
        if (get().socket?.connected) get().socket.disconnect()

    }




}))
