// Mock authentication service for testing frontend without backend
const mockUsers = [
  {
    id: 1,
    email: 'admin@gurukul.com',
    password: 'admin123',
    fullName: 'Admin User',
    role: 'Admin'
  },
  {
    id: 2,
    email: 'principal@gurukul.com',
    password: 'principal123',
    fullName: 'Principal Sharma',
    role: 'Principal'
  },
  {
    id: 3,
    email: 'hod@gurukul.com',
    password: 'hod123',
    fullName: 'HOD Computer Science',
    role: 'HOD'
  },
  {
    id: 4,
    email: 'teacher@gurukul.com',
    password: 'teacher123',
    fullName: 'Teacher Kumar',
    role: 'Teacher'
  },
  {
    id: 5,
    email: 'parent@gurukul.com',
    password: 'parent123',
    fullName: 'Parent Singh',
    role: 'Parent'
  },
  {
    id: 6,
    email: 'caretaker@gurukul.com',
    password: 'caretaker123',
    fullName: 'Caretaker Patel',
    role: 'Caretaker'
  }
];

export const mockLogin = async (email, password) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const user = mockUsers.find(u => u.email === email && u.password === password);
  
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    const token = `mock_token_${user.id}_${Date.now()}`;
    
    return {
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    };
  } else {
    throw new Error('Invalid email or password');
  }
};

export const mockMe = async (token) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Extract user ID from mock token
  const userId = parseInt(token.split('_')[2]);
  const user = mockUsers.find(u => u.id === userId);
  
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return {
      success: true,
      user: userWithoutPassword
    };
  } else {
    throw new Error('Invalid token');
  }
};
