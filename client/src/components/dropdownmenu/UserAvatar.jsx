import React from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import MiniProfile from "../MiniProfile";

const UserAvatar = ({ user, children, onClose }) => {
  if (!user) return <>{children}</>;

  return (
    <Tippy
      content={<MiniProfile user={user} onClose={onClose} />}
      placement="top"
      interactive={true}
      delay={[500, 200]}
    >
      {children}
    </Tippy>
  );
};

export default UserAvatar;