
Rave
Theme Breakdown (2024 Style)
This is the full design system and product identity behind Rave’s 2024 aesthetic — from colors and spacing to psychology, layout philosophy, animations, and UI architecture.
￼
 
￼
 
￼
 
￼

 
⸻
 
1. Product Identity
Rave is NOT designed like:
	•	a productivity app
	•	a corporate dashboard
	•	a traditional streaming platform
It’s designed like:
	•	a social night-time hangout
	•	a digital living room
	•	a Gen Z entertainment space
	•	a multiplayer media experience
The UI philosophy is:
“Content first, people second, controls third.”
Meaning:
	1.	Video dominates the screen
	2.	Social interaction surrounds it
	3.	Controls stay subtle/minimal
 
⸻
 
2. Core Design Language
Style Keywords
Rave’s visual language is:
	•	Dark
	•	Cinematic
	•	Social
	•	Neon
	•	Soft-glow
	•	Glassy
	•	Minimal
	•	Rounded
	•	Immersive
	•	Floating UI
 
⸻
 
3. Exact Color System
Main Backgrounds
--bg-main: #0B0B10;
--bg-secondary: #14141B;
--bg-elevated: #1B1B24;
--bg-hover: #232331;
 
⸻
 
Accent Colors
Primary Purple
--purple-primary: #8B5CF6;
Bright Pink
--pink-primary: #EC4899;
Electric Blue
--blue-primary: #3B82F6;
Success Green
--green: #10B981;
 
⸻
 
Text Hierarchy
--text-primary: #FFFFFF;
--text-secondary: #B3B3C2;
--text-muted: #6B7280;
 
⸻
 
4. Typography System
Fonts
Main Font
Use:
font-family: 'Inter', sans-serif;
Alternative:
	•	SF Pro Display
	•	Poppins
 
⸻
 
Font Weights
300 = subtle labels
400 = normal text
500 = UI labels
600 = buttons
700 = titles
800 = hero headings
 
⸻
 
Typical Sizes
12px = tiny metadata
14px = chat text
16px = body text
20px = subtitles
28px = section titles
42px = hero text
 
⸻
 
5. Spacing Philosophy
Rave uses:
	•	spacious layouts
	•	soft padding
	•	breathing room
Typical Padding
padding: 16px;
padding: 20px;
padding: 24px;
 
⸻
 
6. Border Radius System
VERY important to the vibe.
8px  = tiny pills
12px = inputs
16px = cards
20px = containers
999px = buttons
Rounded corners create:
	•	softness
	•	comfort
	•	friendliness
 
⸻
 
7. Glassmorphism
Huge part of Rave.
Card Example
background: rgba(255,255,255,0.05);
backdrop-filter: blur(18px);
border: 1px solid rgba(255,255,255,0.08);
This creates:
	•	depth
	•	futuristic feel
	•	premium atmosphere
 
⸻
 
8. Shadows & Glow
Rave avoids harsh shadows.
Instead:
	•	ambient glows
	•	soft elevation
Example:
box-shadow:
0 0 30px rgba(139,92,246,.15);
 
⸻
 
9. Layout Structure
Main Watch Room Layout
-----------------------------------
|                                 |
|         VIDEO PLAYER            |
|                                 |
-----------------------------------
| Chat Sidebar | Members          |
-----------------------------------
| Playback Controls               |
-----------------------------------
 
⸻
 
10. Video-First Design
The video ALWAYS dominates.
Important rules:
	•	large media
	•	dark surroundings
	•	distractions minimized
The UI should disappear psychologically while watching.
 
⸻
 
11. Sidebar Design
The sidebars are:
	•	translucent
	•	collapsible
	•	narrow
	•	softly separated
Example:
width: 320px;
background: rgba(20,20,27,.82);
 
⸻
 
12. Chat Design
Messages
Messages are:
	•	compact
	•	rounded
	•	lightweight
Example:
.chat-message {
  padding: 10px 14px;
  border-radius: 14px;
}
 
⸻
 
13. Button Philosophy
Buttons are:
	•	pill-shaped
	•	glowing
	•	soft
	•	gradient-based
Example:
background:
linear-gradient(
135deg,
#8B5CF6,
#EC4899
);
 
⸻
 
14. Hover Animations
EVERYTHING subtly reacts.
Hover Rules
transition: all .25s ease;
Effects:
	•	slight scale
	•	brighter glow
	•	elevation
	•	subtle movement
 
⸻
 
15. Motion Design
Rave feels alive because of motion.
Use:
	•	Framer Motion
	•	CSS transitions
Animations:
	•	fade in
	•	slide up
	•	scale hover
	•	floating panels
	•	smooth modal appearance
 
⸻
 
16. Navigation Style
Rave avoids:
	•	heavy menus
	•	complex dashboards
Instead:
	•	floating nav
	•	bottom tabs
	•	icon-focused navigation
 
⸻
 
17. Iconography
Use:
	•	Lucide Icons
	•	Phosphor
	•	Heroicons
Style:
	•	outlined
	•	thin
	•	rounded
 
⸻
 
18. Mobile Design
Rave is EXTREMELY mobile-first.
Even desktop:
	•	feels touch-friendly
	•	large tap areas
	•	bottom-centered controls
 
⸻
 
19. Emotional Design
This matters more than CSS.
The feeling should be:
	•	cozy
	•	immersive
	•	nighttime
	•	social
	•	relaxed
Like:
“Watching movies with friends at 2 AM.”
 
⸻
 
20. Landing Page Structure
Hero Section
Contains:
	•	dark gradient
	•	glowing CTA
	•	floating app mockups
	•	blurred colorful background blobs
 
⸻
 
21. Background Effects
Use:
background:
radial-gradient(circle at top left,
rgba(139,92,246,.2),
transparent 35%);
 
⸻
 
22. Blur Effects
Very common:
backdrop-filter: blur(20px);
 
⸻
 
23. Card Design
.card {
  background: rgba(255,255,255,.04);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,.08);
}
 
⸻
 
24. User Presence System
Rave emphasizes:
	•	avatars
	•	online indicators
	•	reactions
	•	room presence
Because it’s SOCIAL first.
 
⸻
 
25. Sound & Feedback
Modern social apps use:
	•	micro sounds
	•	hover feedback
	•	subtle vibration (mobile)
 
⸻
 
26. Scroll Behavior
Use:
scroll-behavior: smooth;
And custom dark scrollbars.
 
⸻
 
27. Recommended Stack
Frontend
	•	Next.js
	•	React
Styling
	•	Tailwind CSS
Components
	•	shadcn/ui
	•	Radix UI
Animations
	•	Framer Motion
 
⸻
 
28. Best Folder Structure
/app
/components
/styles
/hooks
/lib
/features
 
⸻
 
29. Exact Theme Variables
:root {

--bg-main: #0B0B10;
--bg-secondary: #14141B;

--card: rgba(255,255,255,0.05);

--purple: #8B5CF6;
--pink: #EC4899;

--text-main: #FFFFFF;
--text-muted: #B3B3C2;

--radius-lg: 20px;

}
 
⸻
 
30. Final UI Psychology
Rave’s UI succeeds because:
It combines:
	•	entertainment
	•	social connection
	•	minimalism
	•	immersion
Without feeling:
	•	corporate
	•	cluttered
	•	technical
The app feels like:
“Discord for watching stuff together.”
That emotional identity is the real “theme.”
