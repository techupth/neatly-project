import { Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import BookingPage from "./BookingPage";
import RoomDetailPage from "./RoomDetailPage";
import ProfilePage from "./ProfilePage";
import PaymentMethodPage from "./PaymentMethodPage";
import BookingSummary from "./BookingSummaryPage";
import HistoryPage from "./HistoryPage";
import CancelPage from "./CancelPage";
import ChangeDatePage from "./ChangeDatePage";
import Payment from "../Components/Payment";
import ThankForBooking from "./ThankForBookingPage";
import { useBooking } from "../contexts/booking";
import AdminPage from "./AdminPage";
import { useAuth } from "../contexts/authentication";
function AuthenticatedApp() {
  let bookingData = useBooking();
  const auth = useAuth();
  if (auth.role === "admin") {
    console.log("test");
    return <Routes></Routes>;
  } else {
    return (
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
          {bookingData && (
            <Route path="/booking-summary" element={<BookingSummary />} />
          )}
          <Route path="/succeed" element={<ThankForBooking />} />
          <Route path="/roomdetail/:roomTypeId" element={<RoomDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/payment-method" element={<PaymentMethodPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/cancel" element={<CancelPage />} />
          <Route path="/changedate" element={<ChangeDatePage />} />
          <Route path="*" element={<HomePage />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    );
  }
}

export default AuthenticatedApp;
