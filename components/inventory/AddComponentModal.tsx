"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from '@/components/ui/ImageUpload';
import { Loader2 } from 'lucide-react';
import { addComponent } from '@/lib/inventory';
import { toast } from 'sonner';

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    quantity: z.coerce.number().min(0, "Quantity must be at least 0"),
    type: z.string().min(1, "Type is required"),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
});

interface AddComponentModalProps {
    onSuccess?: () => void;
}

export const AddComponentModal: React.FC<AddComponentModalProps> = ({ onSuccess }) => {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            quantity: 1,
            type: "Sensor",
            description: "",
            imageUrl: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            await addComponent({
                ...values,
                availableQuantity: values.quantity, // Initially available = total
                imageUrl: values.imageUrl || "https://via.placeholder.com/150",
            });
            toast.success("Component added successfully");
            setOpen(false);
            form.reset();
            onSuccess?.();
        } catch (error: any) {
            console.error("Error adding component:", error);
            toast.error(error.message || "Failed to add component");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    <span className="mr-2">+</span> Add Component
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add New Component</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Add a new item to the inventory.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Component Image</FormLabel>
                                    <FormControl>
                                        <div className="flex justify-center">
                                            <ImageUpload
                                                value={field.value}
                                                onChange={(url) => field.onChange(url)}
                                                onRemove={() => field.onChange("")}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Arduino Uno" {...field} className="bg-gray-800 border-gray-700" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} className="bg-gray-800 border-gray-700" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-gray-800 border-gray-700">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                <SelectItem value="Sensor">Sensor</SelectItem>
                                                <SelectItem value="Microcontroller">Microcontroller</SelectItem>
                                                <SelectItem value="Actuator">Actuator</SelectItem>
                                                <SelectItem value="Tool">Tool</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Details about functionality..." {...field} className="bg-gray-800 border-gray-700" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 w-full">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Add Component
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
