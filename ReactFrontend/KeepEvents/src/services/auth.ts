
export async function login(userEmail: string, password: string) {

  const body = {
    email: userEmail,
    password,
  }
  console.log(JSON.stringify(body));
  const response = await fetch(`/api/users/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    logout();
    throw new Error("Invalid userEmail or password");
  }
  return response.json();
}

export async function logout() {
  const response = await fetch("/api/logout/", {
    method: "POST",
    credentials: "include", // 🔥 required
  });

  if (!response.ok) {

    throw new Error("Logout failed");
  }

  return response.json();
}



export async function register(userEmail: string, password: string , name: string) {
  const body = {
    email: userEmail,
    username : name,
    password,
    
  }
  console.log(JSON.stringify(body));
  const response = await fetch(`/api/users/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body), 
  });

  return response.json();
}


export async function resendOTP(userEmail: string) {
  const body = {
    email: userEmail,
  }
  const response = await fetch(`/api/auth/request-otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // if (!response.ok) {
  //   throw new Error("Failed to resend OTP");
  // }
  return response.json();

}

export async function verifyOTP(userEmail: string, otp: string) {
  const body = {
    email: userEmail,
    code : otp,
  }
  const response = await fetch(`/api/auth/verify-otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  console.log(response);
  if (!response.ok) {
    throw new Error("Failed to verify OTP");
  }
  return response.json();

}

export async function getMe() {
  const response = await fetch(  "/api/me/", {
    method: "GET",
    credentials: "include", // 🔥 REQUIRED for cookies
  });

  if (!response.ok) {
    throw new Error("Not authenticated");
  }

  return response.json();
}



export async function checkAuth() {
  
}

export async function resetPassword(userEmail: string,newPassword: string) {
  const body = {
    email: userEmail,
    new_password: newPassword,
  };
  const response = await fetch(`/api/users/reset-password/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Failed to reset password");
  }
  return response.json();
}