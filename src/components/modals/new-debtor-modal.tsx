"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createDebtor } from "@/app/actions/debtors";
import {
    Loader2, Search, User, X
} from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";

const formSchema = z.object({
    clientName: z.string().min(1, "Nome é obrigatório"),
    phone: z.string().min(10, "Telefone inválido"),
    amountPaid: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "Valor inválido",
    }),
    amountRemaining: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "Valor inválido",
    }),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
});

interface SimplePerson {
    id: string;
    name: string;
    phone: string;
}

interface NewDebtorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    people?: SimplePerson[];
}

export function NewDebtorModal({ open, onOpenChange, people = [] }: NewDebtorModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredPeople, setFilteredPeople] = useState<SimplePerson[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<SimplePerson | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientName: "",
            phone: "",
            amountPaid: "0",
            amountRemaining: "0",
            dueDate: "",
            notes: "",
        },
    });

    // Reset when modal opens/closes
    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setSelectedPerson(null);
            setIsSearching(false);
            form.reset();
        } else {
            setFilteredPeople(people);
        }
    }, [open, people, form]);

    // Filter people based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredPeople(people);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = people.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.phone.includes(query)
        );
        setFilteredPeople(filtered);
    }, [searchQuery, people]);

    const handleSelectPerson = (person: SimplePerson) => {
        setSelectedPerson(person);
        form.setValue("clientName", person.name);
        form.setValue("phone", person.phone);
        setIsSearching(false); // Close search view
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const result = await createDebtor({
                ...values,
                amountPaid: Number(values.amountPaid),
                amountRemaining: Number(values.amountRemaining),
            });

            if (result.success) {
                toast.success("Devedor registrado com sucesso");
                form.reset();
                onOpenChange(false);
                router.refresh();
            } else {
                toast.error(result.error || "Erro ao registrar");
            }
        } catch {
            toast.error("Erro ao registrar");
        } finally {
            setIsLoading(false);
        }
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Novo Devedor</DialogTitle>
                </DialogHeader >

                {/* Seleção de Pessoa */}
                {
                    !selectedPerson ? (
                        <div className="mb-4 space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar cliente por nome ou telefone..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setIsSearching(true);
                                    }}
                                    onFocus={() => setIsSearching(true)}
                                />
                            </div>

                            {/* Lista de resultados (só mostra se estiver buscando ou se houver query) */}
                            {isSearching && (
                                <div className="border border-white/[0.1] rounded-md max-h-[200px] overflow-y-auto bg-zinc-950/50">
                                    {filteredPeople.length === 0 ? (
                                        <div className="p-3 text-sm text-center text-muted-foreground">
                                            Nenhum cliente encontrado.
                                        </div>
                                    ) : (
                                        filteredPeople.map((person) => (
                                            <div
                                                key={person.id}
                                                className="p-2 hover:bg-white/[0.05] cursor-pointer flex items-center justify-between border-b border-white/[0.05] last:border-0"
                                                onClick={() => handleSelectPerson(person)}
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">{person.name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatPhone(person.phone)}</p>
                                                </div>
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                                    <User className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {!isSearching && (
                                <div className="text-xs text-muted-foreground text-center">
                                    Ou preencha manualmente abaixo
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <User className="h-4 w-4 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-emerald-100">{selectedPerson.name}</p>
                                    <p className="text-xs text-emerald-400/70">{formatPhone(selectedPerson.phone)}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedPerson(null);
                                    form.setValue("clientName", "");
                                    form.setValue("phone", "");
                                    setSearchQuery("");
                                }}
                                className="h-8 w-8 p-0 hover:bg-emerald-500/20 text-emerald-400"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )
                }

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="clientName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Cliente</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: João Silva" {...field} readOnly={!!selectedPerson} className={cn(selectedPerson && "bg-muted/50")} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>WhatsApp</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(11) 99999-9999" {...field} readOnly={!!selectedPerson} className={cn(selectedPerson && "bg-muted/50")} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amountPaid"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor Pago (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="amountRemaining"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Falta Pagar (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data Combinada (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Detalhes do acordo..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-brand-accent text-brand-bg hover:bg-brand-accent/90">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent >
        </Dialog >
    );
}
