import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  initialValue: string;
  disabled: boolean;
  onSave: (val: string) => void;
}

export function ChecklistTextoInput({ initialValue, disabled, onSave }: Props) {
  const [value, setValue] = useState(initialValue);
  const savedRef = useRef(initialValue);
  useEffect(() => { setValue(initialValue); savedRef.current = initialValue; }, [initialValue]);
  const handleBlur = () => { if (value !== savedRef.current) { savedRef.current = value; onSave(value); } };
  return (
    <Input
      className="h-7 w-full text-xs px-2 mt-0.5"
      placeholder="Texto..."
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
    />
  );
}
