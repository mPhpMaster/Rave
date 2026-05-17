"use client";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface Props {
  onSelect: (native: string) => void;
}

export default function EmojiPickerWrapper({ onSelect }: Props) {
  return (
    <Picker
      data={data}
      theme="dark"
      previewPosition="none"
      skinTonePosition="none"
      onEmojiSelect={(emoji: { native?: string }) => {
        if (emoji?.native) onSelect(emoji.native);
      }}
    />
  );
}
