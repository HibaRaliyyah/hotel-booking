import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  // Match backend port
  axios.defaults.baseURL = "http://localhost:3000";

  // ---------------- ROOMS ----------------
  const [rooms, setRooms] = useState([]);

  // ---------------- SESSION SEARCH CITY ----------------
  const [sessionCity, setSessionCity] = useState(null);

  const addSearchedCity = (city) => {
    if (!city) return;
    setSessionCity(city);
  };

  // ---------------- OWNER ----------------
  const [isOwner, setIsOwner] = useState(false);
  const [showHotelReg, setShowHotelReg] = useState(false);

  // ---------------- FETCH USER (NO RECENT CITY SETTING HERE) ----------------
  const fetchUserData = async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get("/api/user", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setIsOwner(data.isOwner);
      }
    } catch (error) {
      console.log("User fetch error:", error.message);
    }
  };

  useEffect(() => {
    if (user) fetchUserData();
  }, [user]);

  // ---------------- FETCH ROOMS ----------------
  const fetchRooms = async () => {
    try {
      const { data } = await axios.get("/api/rooms");

      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.log("Room fetch error:", error.message);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <AppContext.Provider
      value={{
        navigate,
        axios,
        getToken,
        user,
        rooms,
        sessionCity,
        addSearchedCity,
        isOwner,
        showHotelReg,
        setShowHotelReg,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
