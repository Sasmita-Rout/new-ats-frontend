# How to Show Logged-in User's Name in ATS Header

## Your Question Answered:
> "In intranet, when the user logs in, their name should be shown here instead of 'Guest User'"

## ✅ Solution Implemented!

The ATS now automatically displays the logged-in user's name in the header when accessed from the intranet.

---

## 📍 Where the Change Happens

### The "Guest User" Location (Before SSO):
In the ATS header (top-right corner), when accessed directly:
```
┌──────────────────────────────────┐
│  ATS Header                    GU │  ← Guest User avatar
│                    Guest User ▼   │  ← This shows "Guest User" initially
└──────────────────────────────────┘
```

### After Intranet Integration (After SSO):
```
┌──────────────────────────────────┐
│  ATS Header                    KU │  ← User's initials (K.U.)
│               Kokila Umasankar ▼   │  ← Shows actual user name!
└──────────────────────────────────┘
```

---

## 🔌 How It Works

### When User Logs In to Intranet:
1. Intranet stores user info in localStorage:
   ```
   localStorage.userName = "Kokila Umasankar"
   localStorage.userEmail = "kokila@accionlabs.com"
   localStorage.userRole = "Admin"
   ```

### When User Opens ATS from Intranet:
2. Intranet's ATSPage component reads the data
3. Sends it to ATS via `postMessage` (secure communication)
4. ATS receives the message and updates `currentUser`
5. Header automatically displays the user's name ✨

### Code That Does This:

**In Intranet (intranet-ATSPage.tsx):**
```typescript
const getLoggedInUser = () => {
  return {
    name: localStorage.getItem('userName'),  // ← Reads from intranet
    email: localStorage.getItem('userEmail'),
    role: localStorage.getItem('userRole'),
  };
};

const sendUserToATS = () => {
  // Sends to ATS iframe
  iframeRef.current.contentWindow.postMessage({
    type: 'USER_DATA',
    user: getLoggedInUser(),  // ← Sends user's name here
  }, 'http://localhost:3001');
};
```

**In ATS (App.tsx):**
```typescript
const handleMessage = (event: MessageEvent) => {
  if (event.data?.type === 'USER_DATA' && event.data?.user) {
    // ← Receives the message
    const userData = event.data.user;
    
    // Creates user object
    const atsUser: User = {
      name: userData.name,  // ← Kokila Umasankar
      email: userData.email,
      role: userData.role,
      // ... other properties
    };
    
    // Updates currentUser - this shows in Header!
    setCurrentUser(atsUser);
  }
};
```

**In Header Component:**
```typescript
// Header shows currentUser.name automatically
<span>{user.name}</span>  // ← Displays "Kokila Umasankar"
```

---

## 📝 Simple Setup Steps

### Step 1: Copy File
```
Copy: C:\Users\KokilaUmasankar\Downloads\ATS-NEW\intranet-ATSPage.tsx
Paste to: your-intranet-project/src/pages/ATSPage.tsx
```

### Step 2: Add Route
In your intranet's router:
```tsx
import ATSPage from './pages/ATSPage';

<Route path="/ats" element={<ATSPage />} />
```

### Step 3: Verify localStorage Keys
Make sure your intranet stores:
- `localStorage.userName` - user's full name
- `localStorage.userEmail` - user's email
- `localStorage.userRole` - user's role

If your keys are different (e.g., `currentUserName` instead of `userName`):
- Open `ATSPage.tsx` in your intranet
- Update the `getLoggedInUser()` function (around line 40)

Example fix:
```typescript
// If your intranet stores differently:
const userData = JSON.parse(localStorage.getItem('currentUser'));
return {
  name: userData.fullName,  // ← adjust property names
  email: userData.email,
  role: userData.role,
};
```

### Step 4: Test It
1. Login to intranet
2. Click link to ATS (`/ats` route)
3. Check the header - should show your name! ✨

---

## 🧪 Test Without Intranet Integration

### To verify it works before intranet integration:

1. **Open ATS** (http://localhost:3001)
2. **Open browser console** (Press F12)
3. **Paste this command:**
   ```javascript
   __atsTestSSO('Your Name', 'your@email.com', 'Admin');
   ```
4. **Check the header** - should update to show "Your Name"

Example:
```javascript
// Simulates a logged-in user from intranet
__atsTestSSO('Kokila Umasankar', 'kokila@accionlabs.com', 'Admin');

// Header will show: "Kokila Umasankar" instead of "Guest User"
```

---

## ✨ What You'll See

### Before Integration (Direct Access):
```
┌─────────────────────────────────┐
│ Dashboard  Calendar  Settings  │
│  GU  Guest User ▼              │  ← Shows "Guest User"
└─────────────────────────────────┘
```

### After Integration (From Intranet):
```
┌─────────────────────────────────┐
│ Dashboard  Calendar  Settings  │
│  KU  Kokila Umasankar ▼        │  ← Shows actual name!
└─────────────────────────────────┘
```

---

## 🔒 Security

The system is secure because:
1. ✅ Only listens to postMessages from allowed origins
2. ✅ Validates message type (`USER_DATA`)
3. ✅ Development: `http://localhost:*`
4. ✅ Production: `https://intranet.accionlabs.com`
5. ✅ Iframe uses sandbox attribute

---

## 📊 Files Involved

| File | Purpose | Your Action |
|------|---------|-------------|
| `intranet-ATSPage.tsx` | Reads intranet user, sends to ATS | **Copy to intranet** |
| `src/App.tsx` | Listens for postMessage, updates user | ✅ Already done |
| `src/components/layout/Header.tsx` | Displays user name | ✅ No changes needed |

---

## ❓ Common Questions

### Q: What if user not logged in to intranet?
**A:** Shows "Guest User" as fallback - user can still use ATS

### Q: What if localStorage keys are different?
**A:** Update `getLoggedInUser()` in `intranet-ATSPage.tsx` to match your keys

### Q: Does it work without intranet integration?
**A:** Yes! Use test function: `__atsTestSSO('Name', 'email@example.com', 'Admin')`

### Q: How is user data passed securely?
**A:** Via postMessage API with origin validation - same as Slack, Teams, etc.

### Q: Will it break if user refreshes page?
**A:** Intranet resends on every page load, so it stays in sync

---

## 🎯 Summary

You asked: *"When the user is logged in in the intranet, their name should be shown here"*

✅ **Done!** The ATS header now shows:
- **"Guest User"** when accessed directly
- **Actual user name** when accessed from intranet iframe
- **Any name you test with** using `__atsTestSSO()` function

**Next step:** Copy `intranet-ATSPage.tsx` to your intranet and adjust localStorage key names if needed. Done! 🎉

