import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: string
  setDate: (date: string) => void
  className?: string
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  const formatDate = (dateString: string) => {
    try {
      // Split the date string and create a date using local timezone
      const [year, month, day] = dateString.split('-').map(Number)
      // Return in MM/DD/YYYY format
      return `${month}/${day}/${year}`
    } catch (e) {
      return dateString
    }
  }

  const getLocalDate = (date: Date | undefined) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "h-9 px-2 text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDate(date) : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date ? new Date(formatDate(date)) : undefined}
          onSelect={(newDate) => setDate(getLocalDate(newDate))}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
} 