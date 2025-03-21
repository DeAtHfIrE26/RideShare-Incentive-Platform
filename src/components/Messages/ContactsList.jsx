// Improved contact fetching logic
const fetchContacts = async () => {
  setIsLoading(true);
  try {
    // Fetch both booking-related contacts and user's stored contacts
    const [bookingContacts, savedContacts] = await Promise.all([
      api.get('/bookings/contacts'),
      api.get('/user/contacts')
    ]);
    
    // Merge and deduplicate contacts
    const mergedContacts = mergeAndDeduplicateContacts(
      bookingContacts.data, 
      savedContacts.data
    );
    
    setContacts(mergedContacts);
    setFilteredContacts(mergedContacts);
    setIsLoading(false);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    setError("Failed to load contacts. Please try again.");
    setIsLoading(false);
  }
};

// Function to merge and deduplicate contacts
const mergeAndDeduplicateContacts = (bookingContacts, savedContacts) => {
  const merged = [...bookingContacts];
  
  // Add saved contacts that aren't already in the booking contacts
  savedContacts.forEach(contact => {
    if (!merged.some(c => c.id === contact.id)) {
      merged.push(contact);
    }
  });
  
  return merged.map(contact => ({
    ...contact,
    // Ensure contact has an avatar
    avatar: contact.avatar || generateDefaultAvatar(contact.name)
  }));
}; 