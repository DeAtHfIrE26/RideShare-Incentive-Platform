<nav className="sidebar-navigation">
  <MenuItem icon={<HomeIcon />} to="/" label="Home" />
  <MenuItem icon={<RidesIcon />} to="/rides" label="Rides" />
  <MenuItem 
    icon={<MessagesIcon />} 
    to="/messages" 
    label="Messages" 
    badge={unreadMessages > 0 ? unreadMessages : null} 
  />
  <MenuItem icon={<RewardsIcon />} to="/rewards" label="Rewards" />
  <MenuItem icon={<SafetyIcon />} to="/safety" label="Safety" />
  <MenuItem icon={<AboutIcon />} to="/about" label="About" />
  <MenuItem icon={<ProfileIcon />} to="/profile" label="Profile" />
</nav> 