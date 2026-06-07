import React from "react";
import SidebarElement from "./SidebarElement";
// use public/ URLs for icons
const HomeIcon = "/assets/sidebar/home.svg";
const DocumentsIcon = "/assets/sidebar/documents.svg";
const SettingsIcon = "/assets/sidebar/settings.svg";
const BoltIcon = "/assets/sidebar/bolt.svg";
const LogoutIcon = "/assets/sidebar/logout.svg";
export default function Sidebar() {
  return (
    <aside className="sidebar-container">
      <SidebarElement pageLink="/home" icon={HomeIcon} label="Classes" />
      <SidebarElement pageLink="/canvas" icon={DocumentsIcon} label="Canvas" />
      <SidebarElement
        pageLink="/settings"
        icon={SettingsIcon}
        label="Settings"
      />
      <SidebarElement
        pageLink="/class-details/1"
        icon={BoltIcon}
        label="Details"
      />
      <SidebarElement pageLink="/login" icon={LogoutIcon} label="Logout" />
    </aside>
  );
}
