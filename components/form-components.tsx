import React from 'react';
import {
  Control,
  Controller,
  type FieldErrors,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type UseFormRegister,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select';
interface BaseProps<T extends FieldValues> {
  label?: string;
  hint?: string;
  className?: string;
  name: Path<T>;
  register?: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  required?: boolean;
  rules?: RegisterOptions<T, Path<T>>;
}

export function InputField<T extends FieldValues>({
  label,
  hint,
  className,
  name,
  register,
  errors,
  required,
  rules,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & BaseProps<T>) {
  return (
    <div className={cn('space-y-2')}>
      {label && (
        <Label htmlFor={name} className=''>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </Label>
      )}
      <Input id={name} {...register?.(name, rules)} {...props} className={cn(className)} />
      {hint && <p className='text-sm text-gray-400 mt-1'>{hint}</p>}
      {errors?.[name] && <p className='text-red-500 text-sm mt-1'>{errors[name]?.message as string}</p>}
    </div>
  );
}

export function TextareaField<T extends FieldValues>({
  label,
  hint,
  className,
  name,
  register,
  errors,
  required,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & BaseProps<T>) {
  return (
    <div className={cn('space-y-2')}>
      {label && (
        <Label htmlFor={name} className=''>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </Label>
      )}
      <Textarea id={name} {...register?.(name)} {...props} className={cn(className)} />
      {hint && <p className='text-sm text-gray-400 mt-1'>{hint}</p>}
      {errors?.[name] && <p className='text-red-500 text-sm mt-1'>{errors[name]?.message as string}</p>}
    </div>
  );
}



interface SelectFieldOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectFieldProps<T extends FieldValues> extends BaseProps<T> {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  options: SelectFieldOption[];
  control: Control<T>;
  disabled?: boolean;
}

export function SelectField<T extends FieldValues>({
  label,
  hint,
  control,
  placeholder,
  options,
  className,
  name,
  errors,
  required,
  disabled = false,
  onChange,
}: SelectFieldProps<T>) {
  if (control) {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className='space-y-2'>
            {label && (
              <Label htmlFor={name}>
                {label}
                {required && <span className='text-red-500 ml-1'>*</span>}
              </Label>
            )}
            <Select
              value={field.value || ''}
              onValueChange={val => {
                field.onChange(val);
                if (onChange) {
                  onChange(val);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className={cn(className, 'w-full')}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {options.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {hint && <p className='text-sm text-gray-400 mt-1'>{hint}</p>}
            {errors?.[name] && <p className='text-red-500 text-sm mt-1'>{errors[name]?.message as string}</p>}
          </div>
        )}
      />
    );
  }
}
