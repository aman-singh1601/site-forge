import React,{useId} from 'react'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const LogsTable = ({
    logs
}:{
    logs: string[],
}) => {
    const id = useId();
    return (
        <Table>
            <TableCaption>logs are printed here...</TableCaption>
            <TableBody>
                {logs.map((log: string, index) =>
                    <TableRow key={index}>
                        <TableCell className="font-medium">{log}</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

export default LogsTable