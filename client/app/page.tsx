"use client"
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { io } from "socket.io-client";
import axios from "axios";
import LogsTable from "@/components/pagecomponents/LogsTable";

const socket = io('http://localhost:9001');



export default function Home() {
  const [gitUrl, setGitUrl] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [deploymentUrl, setDeploymentUrl] = useState<string | undefined>('');
  const [logs, setLogs] = useState<string[]>([]);

  const isvalidUrl: boolean = useMemo(() => {
    if(!gitUrl && gitUrl === "") return false;
    const regex = new RegExp(
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/
    );
    return regex.test(gitUrl);
  },[]) 

  const  handleClick = useCallback( async() => {
    if(!isvalidUrl) {
      //enter valid url

    }
    const response = await axios.post('http://localhost:9000/project',{
      gitURL: gitUrl,
      slug: projectId
    });

    if(response && response.data){
      const {projectSlug, url} = response.data.data;
      setProjectId(projectSlug);
      setDeploymentUrl(url);

      socket.emit('subscribe', `logs:${projectSlug}`);
    }

  },[gitUrl, projectId]);

  const handleIncommingMessage = useCallback((message: string) => {
    console.log(message);
    setLogs((prev) => [message, ...prev]);
  },[]);
  useEffect(() => {
    socket.on("message", handleIncommingMessage);

    return () => {
      socket.off("message", handleIncommingMessage);
    }
  }, [handleIncommingMessage]);


  return (
    <main className="">
      <header className="bg-muted flex justify-between text-center px-2 h-10">
        <div>
          logo
        </div>
        <div>
            AKS
        </div>
      </header>
      <section className=" container mx-auto p-4">
        <div>
          <h3> Aman Singh </h3>
        </div>
        <div className="flex justify-center">
            <Input
              className="w-[30%] mr-4" 
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="Enter your Git Repository Url"
            />
            <Button onClick={handleClick} variant="outline">Deploy</Button>
        </div>
        <div>
          <LogsTable logs = {logs}/>
        </div>
      </section>
    </main>
  );
}
