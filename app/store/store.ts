import { configureStore } from '@reduxjs/toolkit'
import { combineReducers } from "redux";
import authReducer from "../store/auth/authSlice"
import requestsReducer from "./requests/requestSlice";
import attendanceReducer from "../store/attendance/attendanceSlice";
import employeeReducer from "../store/employee/employeeSlice";
import payrollReducer from "../store/payroll/payrollSlice";

// Combined reducers
const rootReducer = combineReducers({
  auth: authReducer,
  requests: requestsReducer,
  attendance: attendanceReducer,
  employees: employeeReducer,
  payroll: payrollReducer,
});

export const store = configureStore({
  reducer: rootReducer

});

// Type definitions
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;