# Using the Experience Studio

## Access

Visit `/admin/` on your domain and sign in. Your server administrator creates accounts using the CLI; there is no public registration. Sessions expire after 12 hours. Account settings lets you change your password and signs out all existing sessions.

## Create or edit a stall

1. Choose **Add a stall**, or open an existing card.
2. Enter the name, headline, category and story. Add optional client, date, location, highlights and source link.
3. Choose one of the five designs. The design can differ from the chosen position.
4. Set its accent colour. Upload a cover and/or logo, or choose an existing image.
5. Select a floor position on the map or in the dropdown.
6. Choose **Save draft**. The public website does not change.
7. Choose **Preview**. Unsaved changes are saved first. The preview shows the draft in the real venue and is visible only while you are signed in.
8. Choose **Publish** when ready. Refresh the public website to see it.

The north position is smaller, so large designs are scaled down to fit. Your saved draft can temporarily use an occupied position for preview, but publishing will be blocked until that position is free.

## Replace a live stall

Create and preview the new draft first. Open the old stall and choose **Unpublish from the venue**. Then return to the replacement and publish it in the freed position. The old stall remains available as a draft. This two-action swap can briefly leave the position empty, so do it during a quiet period if necessary.

There can be five published stalls at a time. Drafts do not occupy the live floor plan. Display order controls project cards and numbered navigation, not the physical position.

## Drafts and publishing

- **Draft:** never published, or currently unpublished.
- **Published:** the saved draft and public version match.
- **Unpublished changes:** a public version exists, but the saved draft differs.
- **Duplicate:** creates a new independent draft; it never publishes automatically.
- **Delete:** available only after unpublishing, and permanently removes the record.

If another editor changes the same record, saving may return a conflict. Copy any unsaved text you need, return to the collection, and reopen the latest record before continuing. The system will not silently overwrite that editor's work.

## Images

Upload PNG, JPEG or WebP, up to 8 MB and 25 million decoded pixels. The server re-encodes to WebP, strips metadata, applies orientation and limits dimensions to 2048 pixels. SVG, arbitrary documents, models and animated uploads are not accepted. Covers appear in cards and project details; logos appear next to the venue label. Removing an image selection does not delete its stored file.

## Enquiries

Visitors submit the contact form with consent. A receipt appears only after the API has stored the enquiry successfully. Repeating a timed-out submission from the same form does not create a duplicate.

Open **Enquiry inbox** to view details. Mark conversations New, Contacted or Closed. **Reply by email** opens your email app; the site does not automatically send a message. CSV export includes up to 10,000 newest enquiries and neutralises formula-like spreadsheet cells. Deleting an enquiry permanently removes its active record; older backups follow your backup retention schedule.

## Activity

Activity shows the latest 100 admin actions. It records the editor, action and time, without copying private enquiry text into the log.
