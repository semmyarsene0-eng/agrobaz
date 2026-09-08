
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db, auth } from "../firebase";
import "./Notifications.css";

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  // ==================================================
  // LOAD NOTIFICATIONS
  // ==================================================
  useEffect(() => {
    let unsubscribe = null;

    const setupListener = () => {
      const user = auth.currentUser;

      if (!user) {
        return;
      }

      const notificationsRef = collection(
        db,
        "notifications"
      );

      const notificationsQuery = query(
        notificationsRef,
        where("userId", "==", user.uid)
      );

      unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notificationList =
            snapshot.docs.map((notificationDoc) => ({
              id: notificationDoc.id,
              ...notificationDoc.data(),
            }));

          // Newest first
          notificationList.sort((a, b) => {
            const aTime =
              a.createdAt?.toMillis?.() || 0;

            const bTime =
              b.createdAt?.toMillis?.() || 0;

            return bTime - aTime;
          });

          setNotifications(notificationList);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Notification loading error:",
            error
          );

          setLoading(false);
        }
      );
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // ==================================================
  // MARK ONE AS READ
  // ==================================================
  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(
        doc(
          db,
          "notifications",
          notificationId
        ),
        {
          read: true,
        }
      );
    } catch (error) {
      console.error(
        "Error marking notification as read:",
        error
      );
    }
  };

  // ==================================================
  // MARK ALL AS READ
  // ==================================================
  const markAllAsRead = async () => {
    const unreadNotifications =
      notifications.filter(
        (notification) => !notification.read
      );

    if (unreadNotifications.length === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      await Promise.all(
        unreadNotifications.map(
          (notification) =>
            updateDoc(
              doc(
                db,
                "notifications",
                notification.id
              ),
              {
                read: true,
              }
            )
        )
      );
    } catch (error) {
      console.error(
        "Error marking all notifications as read:",
        error
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // ==================================================
  // OPEN NOTIFICATION
  // ==================================================
  const handleNotificationClick = async (
    notification
  ) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.orderId) {
      navigate("/orders");
      return;
    }

    if (notification.productId) {
      navigate(
        `/product/${notification.productId}`
      );
    }
  };

  // ==================================================
  // NOTIFICATION ICON
  // ==================================================
  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_order":
        return "🛒";

      case "order_accepted":
        return "✅";

      case "order_ready":
        return "📦";

      case "order_completed":
        return "🎉";

      default:
        return "🔔";
    }
  };

  // ==================================================
  // NOTIFICATION TIME
  // ==================================================
  const formatNotificationTime = (timestamp) => {
    if (!timestamp) {
      return "Just now";
    }

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }

    const now = new Date();

    const difference =
      now.getTime() - date.getTime();

    const seconds = Math.floor(
      difference / 1000
    );

    const minutes = Math.floor(
      seconds / 60
    );

    const hours = Math.floor(
      minutes / 60
    );

    const days = Math.floor(
      hours / 24
    );

    if (seconds < 60) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes} ${
        minutes === 1 ? "minute" : "minutes"
      } ago`;
    }

    if (hours < 24) {
      return `${hours} ${
        hours === 1 ? "hour" : "hours"
      } ago`;
    }

    if (days < 7) {
      return `${days} ${
        days === 1 ? "day" : "days"
      } ago`;
    }

    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // ==================================================
  // NOT LOGGED IN
  // ==================================================
  if (!auth.currentUser) {
    return (
      <div className="notifications-page">
        <div className="notifications-container">

          <div className="notifications-empty">

            <div className="empty-notification-icon">
              🔔
            </div>

            <h2>
              Login required
            </h2>

            <p>
              Please login to view your
              notifications.
            </p>

            <button
              onClick={() =>
                navigate("/login")
              }
              className="notifications-primary-button"
            >
              Login
            </button>

          </div>

        </div>
      </div>
    );
  }

  // ==================================================
  // LOADING
  // ==================================================
  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-container">

          <div className="notifications-loading">

            <div className="notification-spinner"></div>

            <p>
              Loading notifications...
            </p>

          </div>

        </div>
      </div>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================
  return (
    <div className="notifications-page">

      <div className="notifications-container">

        {/* HEADER */}
        <div className="notifications-header">

          <div>

            <span className="notifications-eyebrow">
              AGROBAZ
            </span>

            <h1>
              Notifications
            </h1>

            <p>
              Stay updated on your orders
              and marketplace activity.
            </p>

          </div>

          {unreadCount > 0 && (
            <button
              className="mark-all-button"
              onClick={markAllAsRead}
              disabled={markingAll}
            >
              {markingAll
                ? "Marking..."
                : "✓ Mark all as read"}
            </button>
          )}

        </div>


        {/* SUMMARY */}
        <div className="notifications-summary">

          <div className="notification-summary-card">

            <span className="summary-icon">
              🔔
            </span>

            <div>

              <strong>
                {notifications.length}
              </strong>

              <span>
                Total notifications
              </span>

            </div>

          </div>


          <div className="notification-summary-card unread-summary">

            <span className="summary-icon">
              🔴
            </span>

            <div>

              <strong>
                {unreadCount}
              </strong>

              <span>
                Unread
              </span>

            </div>

          </div>

        </div>


        {/* EMPTY */}
        {notifications.length === 0 ? (

          <div className="notifications-empty">

            <div className="empty-notification-icon">
              🔔
            </div>

            <h2>
              You're all caught up
            </h2>

            <p>
              You don't have any notifications
              yet.
            </p>

            <button
              className="notifications-primary-button"
              onClick={() =>
                navigate("/marketplace")
              }
            >
              Browse Marketplace
            </button>

          </div>

        ) : (

          <div className="notifications-list">

            {notifications.map(
              (notification) => (

                <div
                  key={notification.id}
                  className={`notification-card ${
                    notification.read
                      ? "notification-read"
                      : "notification-unread"
                  }`}
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                >

                  {/* ICON */}
                  <div className="notification-icon">
                    {getNotificationIcon(
                      notification.type
                    )}
                  </div>


                  {/* CONTENT */}
                  <div className="notification-content">

                    <div className="notification-title-row">

                      <h3>
                        {notification.title ||
                          "AgroBaz Notification"}
                      </h3>

                      {!notification.read && (
                        <span className="unread-dot"></span>
                      )}

                    </div>

                    <p>
                      {notification.message ||
                        "You have a new notification."}
                    </p>

                    <span className="notification-time">
                      🕐{" "}
                      {formatNotificationTime(
                        notification.createdAt
                      )}
                    </span>

                  </div>


                  {/* MARK READ */}
                  {!notification.read && (
                    <button
                      className="mark-read-button"
                      onClick={(event) => {
                        event.stopPropagation();

                        markAsRead(
                          notification.id
                        );
                      }}
                    >
                      Mark read
                    </button>
                  )}

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default Notifications;

