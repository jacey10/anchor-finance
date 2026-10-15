# Profile Screen Responsiveness and Alignment: Technical Debugging Report

## 1. Overview

This document explains the responsiveness, layout, alignment, and tooltip issues encountered while developing the Profile screen of a React application.

The Profile screen allows authenticated users to:

- View their email address.
- View their membership date.
- Upload or change their profile picture.
- Remove their profile picture.
- Set and save their display name.
- Delete their account.

The application uses React for the frontend and Supabase for authentication, database operations, and profile-picture storage.

The original implementation worked functionally in several areas, but its responsive layout did not match the intended mobile design. The profile-picture removal tooltip also had usability and visibility problems that required investigation.

The primary objective was to correct the layout without unnecessarily changing the existing application architecture or breaking the Supabase functionality.

---

# 2. Intended Layout

## 2.1 Desktop layout

The desktop layout should contain three columns inside the profile card.

| Column | Content |
|---|---|
| Column 1 | Profile avatar and Change Photo button |
| Column 2 | Email address and membership date |
| Column 3 | Display Name input and Save Name button |

The three columns should have consistent spacing and remain aligned within the available card width.

Conceptually:

```text
┌─────────────────────────────────────────────────────────────┐
│                      PROFILE CARD                            │
│                                                             │
│   COLUMN 1          COLUMN 2            COLUMN 3             │
│                                                             │
│   ┌──────────┐      Email Address       Display Name         │
│   │          │      user@example.com    ┌─────────────────┐  │
│   │  Avatar  │                           │ Enter name...   │  │
│   │          │      Member Since         └─────────────────┘  │
│   └──────────┘      15 Jan 2025          ┌─────────────────┐  │
│   Change Photo                           │    Save Name    │  │
│                                          └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The layout should make efficient use of the available horizontal space while maintaining readable text, consistent alignment, and sufficient separation between columns.

## 2.2 Mobile layout

The mobile layout should reorganize the content into two columns at the top and a full-width section underneath.

The first column contains:

- Profile avatar.
- Change Photo button directly underneath the avatar.

The second column contains:

- Email address.
- Membership date.

Below these two columns, the Display Name section should occupy the full available width.

The Save Name button should appear directly beneath the input.

Conceptually:

```text
┌──────────────────────────────────┐
│           PROFILE CARD            │
│                                  │
│  COLUMN 1       COLUMN 2          │
│                                  │
│  ┌─────────┐    Email Address     │
│  │         │    user@example.com  │
│  │ Avatar  │                      │
│  │         │    Member Since      │
│  └─────────┘    15 Jan 2025       │
│  Change Photo                     │
│                                  │
│  ──────────────────────────────  │
│                                  │
│  Display Name                     │
│  ┌────────────────────────────┐  │
│  │ What should we call you?   │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │          Save Name          │  │
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

This layout preserves the relationship between the avatar and its action button while allowing the account information to remain visible beside them.

The display-name section is moved below both columns rather than appearing beside the avatar.

---

# 3. Issue One: Uneven or Inconsistent Spacing Between Desktop Columns

## 3.1 Original implementation

The original profile card used:

```css
.profile-card {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 24px;
  align-items: center;
}
```

This creates three grid columns:

- `auto`: the browser calculates the first column's size from its content and grid sizing rules.
- `1fr`: the second column receives a share of the remaining available space.
- `1fr`: the third column receives a share of the remaining available space.

The `gap: 24px` declaration creates a consistent 24-pixel gutter between adjacent grid tracks.

## 3.2 Why the issue occurred

The problem was not necessarily that the CSS Grid gaps were unequal.

The actual issue was that the columns had different sizing rules.

The first column used `auto`, while the other two used fractional units. Consequently, the first column did not participate in the same equal-width distribution as the other two.

This could make the overall layout appear uneven, especially when the content in the information or display-name columns had different intrinsic widths.

The distinction is important:

- `gap` controls the distance between grid tracks.
- `grid-template-columns` controls the width allocated to each track.
- `align-items` controls the alignment of items within their grid areas.

Changing the gap alone would not solve a column-sizing problem.

## 3.3 Fix

The desktop layout was changed to:

```css
.profile-card {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
```

## 3.4 Why the fix works

### Fixed avatar column

```css
grid-template-columns: 180px minmax(0, 1fr) minmax(0, 1fr);
```

The avatar column receives a predictable width of 180 pixels.

This gives the avatar and Change Photo button a stable area.

### Equal fractional columns

The other two columns use:

```css
minmax(0, 1fr)
```

Both columns receive equal shares of the remaining space after the avatar column and the grid gaps have been accounted for.

For example, if the grid has 900 pixels of usable width, the avatar column is 180 pixels wide, and the two gaps total 48 pixels, then the remaining width is:

```text
900 - 180 - 48 = 672px
```

The information and display-name columns each receive:

```text
672 / 2 = 336px
```

The example assumes that 900 pixels is the grid's usable content width after its padding and border have been accounted for.

### Why `minmax(0, 1fr)` matters

A plain fractional track can be affected by the intrinsic minimum size of its contents.

Long email addresses, wide inputs, or other content may cause a grid track to resist shrinking as much as intended.

Using:

```css
minmax(0, 1fr)
```

allows the track to shrink below its content's intrinsic minimum size when necessary.

This is particularly useful for responsive interfaces containing long text or form controls.

### Consistent gutters

```css
gap: 24px;
```

Maintains a consistent 24-pixel gap between the three columns.

**Result:** The desktop layout has predictable column widths and consistent spacing.

---

# 4. Issue Two: Incorrect Mobile Grid Arrangement

## 4.1 Original implementation

The original mobile CSS contained:

```css
@media (max-width: 767px) {
  .profile-card {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      "avatar info"
      "avatar name";
    gap: 16px;
    align-items: start;
    padding: 24px;
  }

  .profile-col-avatar {
    grid-area: avatar;
  }

  .profile-col-info {
    grid-area: info;
  }

  .profile-col-name {
    grid-area: name;
  }
}
```

This code created two columns and two rows.

The named grid areas arranged the content as follows:

```text
┌─────────────────────────────────┐
│ Avatar       Information        │
│              Email              │
│              Membership date    │
│              Display Name       │
│              Input              │
│              Save Name          │
└─────────────────────────────────┘
```

The avatar occupied both rows because its grid area was named `avatar` in both rows of the grid-template definition.

The information occupied the first row, while the display-name section occupied the second row.

## 4.2 Why the issue occurred

The grid definition explicitly positioned the display-name section beside the avatar.

This conflicted with the intended mobile design, where the display-name section should appear beneath both the avatar and information columns.

The problem was caused by the grid-area definition rather than by React or Supabase.

The browser was correctly following the CSS instructions; those instructions simply described the wrong layout.

## 4.3 Fix

The mobile grid was changed to:

```css
@media (max-width: 767px) {
  .profile-card {
    grid-template-columns:
      minmax(0, 0.85fr)
      minmax(0, 1.15fr);

    grid-template-areas:
      "avatar info"
      "name name";

    gap: 24px 16px;
    align-items: start;
    padding: 20px;
  }

  .profile-col-avatar {
    grid-area: avatar;
  }

  .profile-col-info {
    grid-area: info;
  }

  .profile-col-name {
    grid-area: name;
  }
}
```

## 4.4 Why the fix works

The mobile layout now contains two explicit rows.

The first row:

```css
"avatar info"
```

places the avatar section in the first column and the information section in the second column.

The second row:

```css
"name name"
```

allows the display-name section to span both columns.

Because the display-name section occupies both grid tracks, it appears below the two top columns.

The CSS Grid layout engine handles this arrangement automatically.

No JavaScript calculations or viewport-dependent React rendering are necessary.

---

# 5. Issue Three: Incorrect Column Proportions on Mobile

## 5.1 Original implementation

The original mobile grid used:

```css
grid-template-columns: auto 1fr;
```

The first column was sized automatically, while the second received a fractional share of the remaining width.

## 5.2 Why the issue occurred

The avatar column's width depended on its content and intrinsic sizing.

The second column received the remaining width.

This could produce a narrow information column if the first column required more space than expected.

The result was particularly noticeable when:

- The Change Photo button had a relatively long label.
- The email address was long.
- The card had substantial horizontal padding.
- The viewport was narrow.

## 5.3 Fix

The mobile layout uses:

```css
grid-template-columns:
  minmax(0, 0.85fr)
  minmax(0, 1.15fr);
```

## 5.4 Why the fix works

The first column receives 0.85 fractional units, while the second receives 1.15 fractional units.

The total is:

```text
0.85 + 1.15 = 2
```

Therefore, ignoring other constraints, the first column receives 42.5% of the available track width and the second receives 57.5%.

For example, if the grid has 300 pixels of available width for its columns after accounting for the column gap:

```text
First column:  300 × 0.425 = 127.5px
Second column: 300 × 0.575 = 172.5px
```

These proportions give the information column more room for email addresses and membership details.

The exact resulting sizes depend on the card's content width, padding, borders, and gap.

**Result:** The information column receives a larger share of the mobile width without forcing the avatar column to grow unnecessarily.

---

# 6. Issue Four: Change Photo Button Disappeared on Mobile

## 6.1 Original implementation

The original stylesheet contained:

```css
@media (max-width: 767px) {
  .profile-col-avatar .btn-outline {
    display: none;
  }
}
```

The JSX rendered the Change Photo button inside the avatar column:

```jsx
<button
  className="btn btn-outline"
  onClick={() => fileInputRef.current?.click()}
  disabled={uploading}
>
  {uploading
    ? 'Uploading...'
    : avatarUrl
      ? 'Change photo'
      : 'Add photo'}
</button>
```

## 6.2 Why the issue occurred

The mobile stylesheet explicitly instructed the browser not to display the button.

The rule:

```css
display: none;
```

removes the element from the visual layout.

Consequently, the button disappeared on mobile even though React continued rendering it.

This was a CSS visibility issue, not a file-input or React state issue.

## 6.3 Fix

The mobile rule was changed to:

```css
@media (max-width: 767px) {
  .profile-col-avatar .btn-outline {
    display: block;
    width: 100%;
    max-width: 140px;

    padding: 8px 6px;
    font-size: 12px;
    line-height: 1.4;

    white-space: normal;
    text-align: center;
    overflow-wrap: anywhere;
  }
}
```

## 6.4 Why the fix works

### Explicit visibility

```css
display: block;
```

Ensures the button is displayed.

### Responsive width

```css
width: 100%;
max-width: 140px;
```

Allows the button to fit within its column without growing indefinitely.

### Text wrapping

```css
white-space: normal;
overflow-wrap: anywhere;
```

Allows the button's label to wrap when necessary.

This prevents a long label from forcing the column wider than intended.

### Centered alignment

```css
text-align: center;
```

Keeps the button label visually balanced.

**Result:** The Change Photo button remains visible directly beneath the avatar on mobile.

---

# 7. Issue Five: Display Name Input Could Overflow Its Column

## 7.1 Original implementation

The display-name section used:

```jsx
<div className="profile-col-name">
  <label className="form-label">Display Name</label>

  <input
    type="text"
    className="auth-input"
    value={displayName}
    onChange={(e) => setDisplayName(e.target.value)}
    placeholder="What should we call you?"
    maxLength={30}
    autoComplete="nickname"
  />

  <button className="btn btn-outline">
    Save name
  </button>
</div>
```

The stylesheet primarily controlled the parent column.

It did not explicitly ensure that the input's border, padding, and width remained within the grid track.

## 7.2 Why the issue occurred

An input element may have a width of 100% while its box model adds padding and borders outside that declared width.

With the default `content-box` model, for example:

```css
width: 100%;
```

sets the width of the content area, not the total rendered width.

Additional horizontal padding and borders can cause the input to extend beyond its container.

Grid items can also have intrinsic minimum sizes that interfere with shrinking.

## 7.3 Fix

The updated stylesheet uses:

```css
.profile-col-name {
  min-width: 0;
}

.profile-col-name .auth-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
```

For the mobile Save Name button:

```css
@media (max-width: 767px) {
  .profile-col-name .btn-outline {
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin-top: 8px;
  }
}
```

## 7.4 Why the fix works

### `min-width: 0`

Allows the grid item to shrink below its automatic intrinsic minimum size.

This is useful for grid and flex children that contain wide content.

### `box-sizing: border-box`

Includes padding and borders in the declared width.

For an input with:

```css
width: 100%;
box-sizing: border-box;
```

the rendered border box fits within the available width of its containing block.

### Full-width button

The Save Name button fills the available width on mobile, aligning it with the input above.

**Result:** The display-name input and button fit within the full-width mobile section without introducing unnecessary horizontal overflow.

---

# 8. Issue Six: Long Email Addresses Could Break the Layout

## 8.1 Original implementation

The original email styling was:

```css
.profile-email {
  font-size: 16px;
  color: var(--text-bright);
  margin: 4px 0 0 0;
  word-break: break-all;
}
```

The declaration `word-break: break-all` already allowed aggressive wrapping of long email addresses.

However, the layout also needed to ensure that the grid column itself could shrink appropriately.

## 8.2 Why the issue occurred

A long email address may contain no convenient natural line breaks.

Even when the text can wrap, the surrounding grid item may retain an intrinsic minimum width unless its sizing constraints allow it to shrink.

This can create a combination of problems:

- Text extending beyond the expected visual boundary.
- Columns appearing too wide.
- Reduced space for the avatar or display-name section.
- Horizontal overflow on smaller screens.

## 8.3 Fix

The updated CSS uses:

```css
.profile-col-info {
  min-width: 0;
  overflow-wrap: anywhere;
}

.profile-email {
  font-size: 16px;
  color: var(--text-bright);
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}
```

On mobile:

```css
@media (max-width: 767px) {
  .profile-email {
    font-size: 14px;
    line-height: 1.5;
  }
}
```

## 8.4 Why the fix works

`overflow-wrap: anywhere` allows the browser to introduce a break when a long word or email address would otherwise overflow.

Unlike relying exclusively on ordinary word boundaries, it accommodates long strings that have no natural wrapping points.

The smaller mobile font also improves readability within the narrower information column.

**Result:** Long email addresses are less likely to cause horizontal overflow.

---

# 9. Issue Seven: Duplicate Mobile Media Queries

## 9.1 Original implementation

The original stylesheet contained two separate mobile media queries:

```css
@media (max-width: 767px) {
  .profile-card {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      "avatar info"
      "avatar name";
  }

  .profile-col-avatar {
    grid-area: avatar;
  }

  .profile-col-info {
    grid-area: info;
  }

  .profile-col-name {
    grid-area: name;
  }
}
```

A second block repeated much of the same configuration and added the rule hiding the Change Photo button.

## 9.2 Why the issue occurred

Duplicate media queries are not inherently invalid CSS.

However, they make responsive styles harder to maintain and debug.

If the same selector is declared multiple times under the same media condition, later declarations can override earlier declarations when specificity is equal.

This creates several maintenance risks:

- A developer may update one block but overlook the other.
- A later declaration may unexpectedly override an earlier change.
- The actual source of a layout problem becomes harder to identify.
- The stylesheet becomes longer without adding useful behavior.

In this case, the duplicated blocks also repeated the incorrect grid arrangement.

## 9.3 Fix

The duplicate mobile rules were consolidated into one media query.

The consolidated block now handles:

- The two-column mobile grid.
- The avatar area.
- The information area.
- The full-width display-name area.
- Mobile input sizing.
- Mobile button sizing.
- Responsive font sizes.
- Tooltip stacking order.

## 9.4 Why the fix works

A single authoritative mobile block makes the intended layout easier to understand.

It also reduces the possibility of accidental overrides when the component is modified later.

**Result:** The responsive behavior becomes easier to maintain and troubleshoot.

---

# 10. Issue Eight: Incorrect Vertical Alignment

## 10.1 Original implementation

The original desktop card used:

```css
align-items: center;
```

The mobile card used:

```css
align-items: start;
```

## 10.2 Why the issue occurred

`align-items` controls the alignment of grid items along the block axis, which is generally the vertical axis in a standard horizontal writing mode.

On desktop, `align-items: center` vertically centers each grid item within its grid area.

The avatar section, information section, and display-name section have different heights.

Centering them can therefore make their top edges appear misaligned.

For example, the display-name section contains an input and button, while the avatar section contains a circular image and one button. Their heights differ.

Vertical centering may place their tops at different positions even when the grid columns are otherwise correct.

## 10.3 Fix

The revised card uses:

```css
align-items: start;
```

## 10.4 Why the fix works

This aligns each grid item's starting edge with the beginning of its grid area.

The avatar, information, and display-name sections begin at the same vertical position on desktop.

On mobile, the avatar and information sections also align at the top of their respective grid areas.

**Result:** The columns have more predictable vertical alignment.

---

# 11. Issue Nine: Profile-Picture Removal Tooltip Was Not Visible

## 11.1 Original implementation

The avatar was clickable:

```jsx
<div
  className="profile-avatar-large"
  onClick={() =>
    avatarUrl &&
    !imgFailed &&
    setShowTooltip(!showTooltip)
  }
>
```

The tooltip was rendered conditionally:

```jsx
{showTooltip && (
  <div className="profile-avatar-tooltip">
    <button onClick={handleRemovePhoto}>
      Remove photo
    </button>
  </div>
)}
```

Its original positioning was:

```css
.profile-avatar-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}
```

The avatar wrapper was positioned relatively:

```css
.profile-avatar-wrap {
  position: relative;
}
```

## 11.2 What we discovered

The original tooltip depended on several conditions.

### Condition 1: An avatar URL must exist

The original click handler only toggled the tooltip when `avatarUrl` was truthy.

If the user had no profile picture, the tooltip could not open.

This is reasonable for a Remove Photo action because there is no photo to remove.

### Condition 2: The image must not have failed

The original handler also required:

```javascript
!imgFailed
```

If the image URL existed but the image failed to load, the tooltip could not open.

This behavior is defensible if the action is intended to operate only on a successfully loaded image, but it can leave a user unable to access photo-management options when the image is temporarily unavailable.

### Condition 3: React state must become true

The tooltip was only rendered when:

```javascript
showTooltip === true
```

CSS positioning alone cannot make a conditionally unrendered React element appear.

### Condition 4: The tooltip must not be obscured

The tooltip was positioned absolutely relative to the avatar wrapper.

Its visibility could also be affected by stacking contexts, clipping ancestors, or competing UI elements.

The original `z-index: 10` was not guaranteed to place it above every other element.

### Condition 5: The outside-click handler must behave correctly

The original implementation used a `mousedown` listener to close the tooltip when clicking outside the avatar wrapper.

This generally works with mouse interactions, but pointer events provide a more consistent basis for handling mouse, pen, and touch interactions.

## 11.3 Fixes applied

### A. Use a semantic button

The avatar was changed from a clickable `div` to a button:

```jsx
<button
  type="button"
  className="profile-avatar-large"
  onClick={() => {
    if (avatarUrl && !imgFailed && !uploading) {
      setShowTooltip((prev) => !prev);
    }
  }}
  disabled={!avatarUrl || imgFailed || uploading}
  aria-label="Manage profile photo"
  aria-expanded={showTooltip}
  aria-haspopup={avatarUrl ? true : undefined}
>
```

A button provides built-in keyboard activation and more appropriate accessibility semantics.

The functional restrictions remain: the button cannot open the removal tooltip when there is no usable image.

### B. Preserve the avatar appearance

Changing a `div` to a `button` introduces browser-default button styling unless explicitly reset.

The CSS therefore includes:

```css
.profile-avatar-large {
  padding: 0;
  border: none;
  appearance: none;
}
```

The avatar retains its circular shape and existing visual styling.

### C. Keep the tooltip inside a positioned wrapper

```css
.profile-avatar-wrap {
  position: relative;
}
```

This makes the avatar wrapper the positioning reference for the tooltip.

### D. Increase the stacking order

```css
.profile-avatar-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}
```

The higher `z-index` helps the tooltip appear above nearby content.

It does not override every possible stacking context or clipping rule, so those still need to be inspected if the tooltip remains invisible.

### E. Use pointer events for outside-click handling

```jsx
useEffect(() => {
  if (!showTooltip) return;

  const handleOutsideClick = (event) => {
    if (
      avatarRef.current &&
      !avatarRef.current.contains(event.target)
    ) {
      setShowTooltip(false);
    }
  };

  document.addEventListener('pointerdown', handleOutsideClick);

  return () => {
    document.removeEventListener('pointerdown', handleOutsideClick);
  };
}, [showTooltip]);
```

This closes the tooltip when the user interacts outside the avatar section.

It also removes the event listener when it is no longer needed.

## 11.4 Why the fixes work

The revised implementation separates the responsibilities:

- React state determines whether the tooltip exists.
- The click handler controls whether the state changes.
- The semantic button provides keyboard interaction.
- CSS positions the tooltip.
- `z-index` helps it appear above adjacent elements.
- The outside-click listener closes it when appropriate.

This distinction matters because a tooltip visibility problem can originate in React rendering, event handling, CSS positioning, or stacking behavior.

**Important:** If the tooltip remains invisible, inspect the browser's developer tools to determine whether the tooltip element exists in the DOM, whether it has visible dimensions, whether it is clipped by an ancestor, and whether another element covers it.

Increasing `z-index` alone will not fix an element that has not been rendered or is clipped by an ancestor.

---

# 12. Issue Ten: Avatar Overlay and Hover Behavior

## 12.1 Original implementation

The avatar included an overlay:

```css
.profile-avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  opacity: 0;
  transition: opacity 0.2s ease;
}
```

It became visible on hover:

```css
.profile-avatar-large:hover .profile-avatar-overlay {
  opacity: 1;
}
```

## 12.2 Potential issue

Hover is not a reliable interaction on touchscreens.

Mobile users generally interact by tapping rather than hovering.

Consequently, the pencil overlay may not appear on mobile in the same way it does on desktop.

This does not necessarily prevent the avatar button from working, but it can make the interface less discoverable.

## 12.3 Fix

The revised CSS includes:

```css
.profile-avatar-overlay {
  pointer-events: none;
}

.profile-avatar-large:hover .profile-avatar-overlay,
.profile-avatar-large:focus-visible .profile-avatar-overlay {
  opacity: 1;
}
```

## 12.4 Why the fix works

`pointer-events: none` prevents the overlay itself from intercepting pointer interactions.

The parent button remains the interactive element.

The `:focus-visible` selector also reveals the overlay when keyboard navigation places focus on the button.

For touch users, the overlay should not be the only indication that the avatar is interactive. The surrounding layout and accessible button label should communicate that functionality.

---

# 13. Issue Eleven: Avatar and Button Sizing on Small Screens

## 13.1 Original implementation

The avatar wrapper was 80 by 80 pixels:

```css
.profile-avatar-wrap {
  width: 80px;
  height: 80px;
}
```

The Change Photo button did not have a dedicated responsive width.

## 13.2 Why the issue occurred

On narrow screens, the avatar and its action button compete for the available width of the first grid column.

An 80-pixel avatar plus a button with a long label may make the column feel cramped.

If the button is prevented from wrapping, its intrinsic width can also affect the layout.

## 13.3 Fix

The mobile CSS uses:

```css
@media (max-width: 767px) {
  .profile-avatar-wrap {
    width: 72px;
    height: 72px;
  }

  .profile-col-avatar .btn-outline {
    width: 100%;
    max-width: 140px;
    white-space: normal;
    text-align: center;
  }
}
```

For particularly narrow screens:

```css
@media (max-width: 380px) {
  .profile-avatar-wrap {
    width: 64px;
    height: 64px;
  }
}
```

## 13.4 Why the fix works

The smaller avatar preserves the circular visual hierarchy while making more room for the information column.

The button is allowed to wrap its text rather than forcing its parent column to expand.

The smaller-screen breakpoint introduces a further reduction when necessary.

**Result:** The avatar and its action button fit more comfortably into the first mobile column.

---

# 14. Issue Twelve: Tooltip and Photo Removal Error Handling

## 14.1 Original implementation

The original photo-removal handler called:

```javascript
await supabase.storage
  .from('avatars')
  .remove([`${user.id}/avatar.jpg`]);
```

It did not check the returned Storage error before proceeding to update the user's metadata.

## 14.2 Why the issue mattered

Supabase client methods commonly return an object containing `data` and `error`.

An unsuccessful operation does not necessarily throw a JavaScript exception automatically.

If the application ignores the returned error, it may proceed as though the operation succeeded.

This can create inconsistent states:

- The storage object still exists.
- The user's metadata says the picture has been removed.
- The UI appears to have completed an operation that only partially succeeded.

## 14.3 Fix

The revised handler checks the returned error:

```javascript
const { error: storageError } = await supabase.storage
  .from('avatars')
  .remove([`${user.id}/avatar.jpg`]);

if (storageError) throw storageError;
```

Only after successful removal does it update the user's metadata:

```javascript
const { data, error } = await supabase.auth.updateUser({
  data: { avatar_url: null },
});

if (error) throw error;

setUser(data.user);
setShowTooltip(false);
```

## 14.4 Why the fix works

The application no longer silently ignores an explicit Storage error.

The tooltip closes after the operation succeeds and the user state has been updated.

If the removal fails, the error is reported rather than silently proceeding to the next step.

However, this sequence is not transactional across Supabase Storage and Auth. If the file is removed successfully but the metadata update fails, the two systems can still become temporarily inconsistent.

A production implementation may need a retry or recovery strategy for this scenario.

---

# 15. Issue Thirteen: Upload State and Image Refresh

## 15.1 Existing behavior

The component already included:

```javascript
const [uploading, setUploading] = useState(false);
const [imgFailed, setImgFailed] = useState(false);
```

The upload handler resized the image, uploaded it to Storage, and updated the user's metadata.

It appended a timestamp to the public image URL:

```javascript
data: {
  avatar_url: `${publicUrl}?v=${Date.now()}`,
}
```

## 15.2 Why this matters

Browsers may cache images.

If the same storage path is reused when a user changes their profile picture, the browser may continue displaying an older cached version.

Appending a changing query parameter makes the URL distinct and encourages the browser to request the new image.

The existing `imgFailed` state also allows the component to fall back to the user's initial when the image cannot load.

## 15.3 Responsive considerations

The image uses:

```css
.avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
```

`object-fit: cover` fills the square image area while preserving the image's aspect ratio.

Combined with a circular parent, this creates a consistent circular avatar across desktop and mobile.

The responsive changes should preserve this behavior rather than altering the image's intrinsic dimensions.

---

# 16. Issue Fourteen: Repeated and Inconsistent Layout Responsibilities

The component's layout responsibilities were distributed across several CSS selectors and media queries.

Some rules defined the base grid, while others modified grid areas, button visibility, and widths.

This made it easier for one rule to contradict another.

## Fix

The revised stylesheet groups related responsibilities into clearly separated sections:

1. Profile card and grid.
2. Profile columns.
3. Avatar.
4. Tooltip.
5. Action buttons.
6. Danger Zone.
7. Mobile responsiveness.
8. Small mobile screens.
9. Tablet and desktop behavior.

## Why the fix works

This organization improves maintainability.

A developer investigating mobile layout can focus on the mobile section rather than searching through multiple duplicated blocks.

It also makes the cascade easier to reason about because each component's base styling and responsive overrides are clearly separated.

CSS still follows normal specificity and source-order rules, so the stylesheet should be checked for conflicts with global styles.

---

# 17. Consolidated Responsive CSS

The final layout depends on several principles working together.

## Desktop

```css
.profile-card {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
```

This creates a fixed avatar column and two equally sized content columns.

## Mobile

```css
@media (max-width: 767px) {
  .profile-card {
    grid-template-columns:
      minmax(0, 0.85fr)
      minmax(0, 1.15fr);

    grid-template-areas:
      "avatar info"
      "name name";

    gap: 24px 16px;
    align-items: start;
    padding: 20px;
  }

  .profile-col-avatar {
    grid-area: avatar;
  }

  .profile-col-info {
    grid-area: info;
  }

  .profile-col-name {
    grid-area: name;
    width: 100%;
    min-width: 0;
  }

  .profile-col-name .auth-input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .profile-col-name .btn-outline {
    width: 100%;
    box-sizing: border-box;
  }
}
```

This creates the intended mobile arrangement without duplicating React components.

The same DOM structure is used for both desktop and mobile. CSS Grid changes the presentation based on viewport width.

---

# 18. Important Distinction: Equal Gaps Versus Equal Column Widths

One of the central lessons from this debugging process is that equal spacing and equal column widths are not the same thing.

## Equal gaps

The following declaration controls the gap between grid tracks:

```css
gap: 24px;
```

It ensures that the gutters are 24 pixels wide.

## Equal column widths

The following declaration distributes the remaining width equally between two columns:

```css
grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
```

## Unequal column widths

The following declaration intentionally gives the second column more space:

```css
grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
```

This is useful on mobile because the information column generally needs more width than the avatar column.

The correct approach depends on the design requirement.

For this profile screen, the selected design uses:

- A fixed avatar column and two equal content columns on desktop.
- A narrower avatar column and wider information column on mobile.
- Consistent gutters in both layouts.

---

# 19. Why CSS Grid Was Appropriate

The profile screen has a clear two-dimensional layout.

On desktop, it contains three columns.

On mobile, it contains two columns followed by a section that spans both columns.

CSS Grid is particularly suitable for this structure because it allows explicit control over rows, columns, and named areas.

Flexbox is useful for one-dimensional arrangements, such as stacking the avatar above its button.

The implementation therefore combines both approaches:

- **CSS Grid** controls the overall profile-card layout.
- **Flexbox** stacks the avatar and button vertically.
- **Flexbox** stacks labels, values, inputs, and buttons within their sections.

This division of responsibility makes the layout easier to understand and maintain.

---

# 20. Verification Checklist

After applying the updated JSX and CSS, test the following cases.

## Desktop testing

- [ ] The avatar appears in the first column.
- [ ] The Change Photo button appears beneath the avatar.
- [ ] Email and membership date appear in the second column.
- [ ] Display Name input and Save Name button appear in the third column.
- [ ] The two content columns share the remaining width equally.
- [ ] All three columns align at the top.
- [ ] No horizontal overflow occurs.
- [ ] The tooltip appears above adjacent content when opened.

## Mobile testing

- [ ] The avatar remains in the first column.
- [ ] Change Photo appears directly beneath the avatar.
- [ ] Email and membership date remain in the second column.
- [ ] The Display Name section spans the full width below both columns.
- [ ] The Save Name button appears directly beneath the input.
- [ ] The input and button fit within the card.
- [ ] Long email addresses wrap correctly.
- [ ] The card does not create horizontal scrolling.
- [ ] The tooltip is not clipped or hidden behind adjacent elements.
- [ ] Touch interactions open and close the tooltip correctly.

## Functional testing

- [ ] Uploading a new picture updates the avatar.
- [ ] Selecting the same file twice works.
- [ ] Invalid file types are rejected.
- [ ] Files larger than the configured size limit are rejected.
- [ ] Removing a picture updates the user's metadata.
- [ ] Failed Storage operations display an error.
- [ ] Saving the display name updates the user's metadata.
- [ ] The Save Name button reflects the saving and saved states.
- [ ] Account deletion requires confirmation.
- [ ] Account deletion is enforced securely on the server.

## Responsive breakpoints

Test at several viewport widths:

| Viewport width | Expected behavior |
|---|---|
| 320px | Compact two-column mobile layout without horizontal scrolling |
| 375px | Mobile layout with readable account information |
| 430px | Mobile layout with additional horizontal space |
| 767px | Mobile layout |
| 768px | Desktop/tablet grid |
| 1024px | Three-column grid |
| 1440px | Three-column grid with more available content width |

The precise transition at 768 pixels follows the configured media queries. It should be tested to ensure the desktop layout remains comfortable at that width.

---

# 21. Lessons Learned

## Lesson 1: A correct component can still have an incorrect layout

The React component can render all the expected information while CSS places it incorrectly.

The mobile display-name issue was caused by the grid-area definition, not by React state.

## Lesson 2: Visibility problems should be investigated in layers

When an element does not appear, investigate:

1. Whether React rendered it.
2. Whether its visibility state is correct.
3. Whether CSS hides it.
4. Whether its dimensions are correct.
5. Whether it is positioned outside the expected area.
6. Whether an ancestor clips it.
7. Whether another element covers it.

This is more reliable than immediately increasing `z-index` or rewriting the component.

## Lesson 3: Grid gaps and column widths solve different problems

A consistent `gap` does not guarantee equal column widths.

Both track sizing and gutter spacing must be configured intentionally.

## Lesson 4: Mobile layouts should not depend on hiding essential controls

The Change Photo button disappeared because the stylesheet explicitly used `display: none`.

Responsive design should reorganize essential controls rather than accidentally remove them.

## Lesson 5: Intrinsic sizing matters

Grid and flex children can resist shrinking because of their content.

Using `min-width: 0`, `minmax(0, 1fr)`, and appropriate text-wrapping rules helps prevent overflow.

## Lesson 6: Repeated media queries increase maintenance costs

Combining duplicate responsive rules reduces ambiguity and makes future changes easier to implement safely.

## Lesson 7: Accessibility improves interaction reliability

A semantic button is more appropriate than a clickable `div` for an interactive avatar.

It supports keyboard interaction and communicates the element's role to assistive technologies.

## Lesson 8: Frontend behavior is not a substitute for backend security

A React confirmation dialog can prevent accidental account deletion, but it cannot enforce authorization.

Supabase must verify authentication, ownership, and execution permissions on the server side.

---

# 22. Final Summary

The main responsiveness issues came from the interaction between CSS Grid sizing, named grid areas, duplicate media queries, button visibility rules, and intrinsic content sizing.

The profile-picture tooltip introduced a separate class of issues involving conditional React rendering, click handling, accessibility, positioning, and stacking order.

The most important changes were:

1. Replacing the desktop grid's `auto 1fr 1fr` sizing with a fixed avatar column and two equal fractional columns.
2. Changing the mobile grid areas from `"avatar info" / "avatar name"` to `"avatar info" / "name name"`.
3. Giving the mobile information column a larger share of the available width.
4. Keeping the Change Photo button visible on mobile.
5. Allowing the display-name input and button to occupy the full width of the card.
6. Allowing long email addresses to wrap without forcing the grid wider.
7. Consolidating duplicated mobile media queries.
8. Improving tooltip interaction and stacking behavior.
9. Checking Supabase Storage errors before updating profile metadata.
10. Keeping account authorization enforced on the server rather than relying on frontend restrictions.

The resulting design preserves the existing React component structure while using CSS Grid for the overall layout and Flexbox for the internal arrangement of individual sections.

The broader lesson is that responsive interfaces become more predictable when each layout rule has a clear responsibility, intrinsic sizing is handled explicitly, and interactive elements are debugged independently from their visual presentation.