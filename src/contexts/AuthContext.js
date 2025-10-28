import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
      
      // Clear any active Firebase listeners when user logs out
      if (!user) {
        // Clear any intervals or timeouts
        if (window.emergencyIntervals) {
          Object.values(window.emergencyIntervals).forEach(intervalId => {
            clearInterval(intervalId);
          });
          window.emergencyIntervals = {};
        }
        
        if (window.allIntervals) {
          window.allIntervals.forEach(intervalId => {
            clearInterval(intervalId);
          });
          window.allIntervals = [];
        }
        
        // Call global cleanup function if it exists
        if (window.stopAllEmergencyNotifications) {
          window.stopAllEmergencyNotifications();
        }
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};