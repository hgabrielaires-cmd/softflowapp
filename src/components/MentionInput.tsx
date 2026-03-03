import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";

interface MentionUser {
  id: string;
  user_id: string;
  full_name: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  users: MentionUser[];
  placeholder?: string;
  className?: string;
  onMentionsChange?: (mentionedUserIds: string[]) => void;
}

export function MentionInput({
  value,
  onChange,
  users,
  placeholder = "Digite um comentário...",
  className = "",
  onMentionsChange,
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mentionStartRef = useRef<number | null>(null);

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // Extract mentioned user_ids from text
  const extractMentions = useCallback(
    (text: string): string[] => {
      const mentionRegex = /@(\w+)/g;
      const mentioned: string[] = [];
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        const name = match[1].trim();
        const user = users.find(
          (u) => u.full_name.toLowerCase() === name.toLowerCase() ||
            u.full_name.split(" ")[0].toLowerCase() === name.toLowerCase()
        );
        if (user && !mentioned.includes(user.id)) {
          mentioned.push(user.id);
        }
      }
      return mentioned;
    },
    [users]
  );

  useEffect(() => {
    if (onMentionsChange) {
      onMentionsChange(extractMentions(value));
    }
  }, [value, extractMentions, onMentionsChange]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(newValue);

    // Check if we're typing after @
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only show dropdown if there's no space before @ (or it's at start) and no newline after @
      const charBeforeAt = atIndex > 0 ? newValue[atIndex - 1] : " ";
      if ((charBeforeAt === " " || charBeforeAt === "\n" || atIndex === 0) && !textAfterAt.includes("\n")) {
        setSearch(textAfterAt);
        mentionStartRef.current = atIndex;
        setShowDropdown(true);
        setSelectedIndex(0);

        // Position dropdown
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
          const lines = textBeforeCursor.split("\n");
          const top = lines.length * lineHeight + 4;
          setDropdownPos({ top, left: 8 });
        }
        return;
      }
    }

    setShowDropdown(false);
    mentionStartRef.current = null;
  };

  const insertMention = (user: MentionUser) => {
    if (mentionStartRef.current === null || !textareaRef.current) return;

    const before = value.slice(0, mentionStartRef.current);
    const cursorPos = textareaRef.current.selectionStart || value.length;
    const after = value.slice(cursorPos);
    const firstName = user.full_name.split(" ")[0];
    const newValue = `${before}@${firstName} ${after}`;
    
    onChange(newValue);
    setShowDropdown(false);
    mentionStartRef.current = null;

    // Refocus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + firstName.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredUsers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filteredUsers[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Textarea
        ref={textareaRef}
        className={`text-xs min-h-[50px] resize-none ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && filteredUsers.length > 0 && (
        <div
          className="absolute z-50 bg-popover border border-border rounded-md shadow-lg max-h-36 overflow-y-auto w-52"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {filteredUsers.slice(0, 8).map((user, idx) => (
            <button
              key={user.id}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
                idx === selectedIndex ? "bg-accent" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span className="font-medium">{user.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Render comment text with @mentions highlighted */
export function renderMentionText(text: string, users: MentionUser[]) {
  const parts: (string | JSX.Element)[] = [];
  const regex = /@(\w+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const name = match[1];
    const user = users.find(
      (u) => u.full_name.split(" ")[0].toLowerCase() === name.toLowerCase()
    );
    if (user) {
      parts.push(
        <span key={match.index} className="text-primary font-semibold">
          @{name}
        </span>
      );
    } else {
      parts.push(`@${name}`);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
