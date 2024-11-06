'use client'

import { useState, useEffect } from 'react'
import { DayPicker } from "react-day-picker"
import { Button } from "app/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from "app/lib/utils"

interface InvoiceCalendarProps {
  invoices: Array<{ id: string; createdAt: Date }>
  onSelectDate: (date: Date | undefined) => void
}

export function InvoiceCalendar({ invoices, onSelectDate }: InvoiceCalendarProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    const dates = new Set(
      invoices.map(invoice => invoice.createdAt.toISOString().split('T')[0])
    )
    setAvailableDates(dates)
  }, [invoices])

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    setDate(newDate || new Date())
    onSelectDate(newDate)
  }

  const handleMonthChange = (month: string) => {
    const newDate = new Date(date)
    newDate.setMonth(parseInt(month))
    setDate(newDate)
  }

  const handleYearChange = (year: string) => {
    const newDate = new Date(date)
    newDate.setFullYear(parseInt(year))
    setDate(newDate)
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(date)
    newDate.setMonth(date.getMonth() - 1)
    setDate(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(date)
    newDate.setMonth(date.getMonth() + 1)
    setDate(newDate)
  }

  const isDayWithInvoice = (day: Date) => {
    const dateString = day.toISOString().split('T')[0]
    return availableDates.has(dateString)
  }

  return (
    <div className="space-y-4 bg-white rounded-lg p-4 shadow-md max-w-sm mx-auto">
      <div className="flex justify-center items-center gap-2">
        <Select onValueChange={handleMonthChange} value={date.getMonth().toString()}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={handleYearChange} value={date.getFullYear().toString()}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() - 5 + i
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        month={date}
        onMonthChange={setDate}
        modifiers={{
          hasInvoice: isDayWithInvoice,
        }}
        modifiersStyles={{
          hasInvoice: {
            fontWeight: 'bold',
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary)',
          }
        }}
        disabled={(date) => !isDayWithInvoice(date)}
        weekStartsOn={1}
        fixedWeeks
        showOutsideDays
        className={cn("rounded-md border mx-auto")}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "hidden", // Hide the navigation container
          nav_button: "hidden", // Hide the navigation buttons
          nav_button_previous: "hidden", // Hide the previous button
          nav_button_next: "hidden", // Hide the next button
          table: "w-full border-collapse",
          head_row: "hidden", // This hides the weekday names
          row: "flex w-full justify-center",
          cell: cn(
            "relative p-0 text-center focus-within:relative focus-within:z-20",
            "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
          ),
          day: cn(
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground mx-auto",
          ),
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        components={{
        }}
      />

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousMonth}
          className="w-[140px]"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          className="w-[140px]"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}