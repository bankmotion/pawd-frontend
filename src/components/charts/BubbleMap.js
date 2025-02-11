import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { Button, TextField, IconButton, Paper, Box, Typography } from "@mui/material";
import * as d3 from "d3";
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { yellow } from "@mui/material/colors";

const BubbleMap = ({ rawData, categorizedWallets }) => {
    const theme = useTheme();
    const svgRef = useRef();
    const [showWallets, setShowWallets] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [tooltip, setTooltip] = useState({
        content: `<div style="font-size: 14px; color: #E0E0E0;"><span style="font-size: 16px; font-weight: bold; color: #4CAF50;">Address:</span>
        <a href="https://etherscan.io/address/${rawData.address}" target="_blank" style="font-size: 14px; color: #E0E0E0; word-wrap: break-word;">${rawData.address || 'N/A'}</a><br><br>
        <span style="font-weight: bold; color: #FF9800;">💰 Native Balance:</span><br>
        <span><span style="color: #E0E0E0;">${rawData.balance} ETH</span></span></div>`
    });
    const [clickedNodeId, setClickedNodeId] = useState(null);
    const [visibilityMap, setVisibilityMap] = useState({});

    // Calculate the maximum profitability
    const maxProfitability = Math.max(...categorizedWallets.map(wallet => wallet.profitability || 0));
    const maxActivityFrequency = Math.max(...categorizedWallets.map(wallet => wallet.txs.length || 0));
    console.log(`Maximum profitability: ${maxProfitability}`);
    console.log(`maxActivityFrequency: ${maxActivityFrequency}`);

    const SEVER_URL = process.env.REACT_APP_SEVER_URL;

    const transformData = (rawData) => {
        const nodes = [];
        const links = [];

        const traverse = (node, parentId = null, group = 1) => {
            const nodeId = node.address || `node-${Math.random().toString(36).substr(2, 9)}`;
            nodes.push({ id: nodeId, group, isMainWallet: node.address === rawData.address, ...node });
            if (parentId) {
                links.push({ source: parentId, target: nodeId });
            }
            if (node.nodes && node.nodes.length > 0) {
                node.nodes.forEach((childNode, index) =>
                    traverse(childNode, nodeId, group + index + 1)
                );
            }
        };

        traverse(rawData);
        console.log(nodes, links, "nodes, links");
        return { nodes, links };
    };

    useEffect(() => {
        const { nodes, links } = transformData(rawData);

        const mainWalletNode = nodes.find((node) => node.isMainWallet);
        if (mainWalletNode && !clickedNodeId) {
            setClickedNodeId(mainWalletNode.id);
        }

        const maxTransactionVolume = Math.max(...categorizedWallets.map(wallet =>
            wallet.txs.reduce((total, tx) => total + parseFloat(tx.value), 0)
        ));

        console.log(maxTransactionVolume, "maxTransactionVolume");

        const thicknessScale = d3.scaleLinear()
            .domain([0, maxTransactionVolume])  // Scale the volume data
            .range([3, 7]);

        console.log(thicknessScale, "thicknessScale");

        const width = 800;
        const height = 600;

        const svg = d3
            .select(svgRef.current)
            .attr("viewBox", [0, 0, width, height])
            .style("font", "12px sans-serif");

        svg.selectAll("*").remove();

        const simulation = d3
            .forceSimulation(nodes)
            .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY(height / 2).strength(0.1))
            .alphaDecay(0.05);

        // Adding a gradient to the arrows for a vibrant effect
        svg.append("defs").append("linearGradient")
            .attr("id", "arrowGradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "100%")
            .attr("y2", "0%")
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#00c6ff") // Start color (light blue)
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#0072ff"); // End color (blue)

        // Create an SVG marker for the arrowhead
        svg.append("defs").selectAll("marker")
            .data(["arrow", "reverse-arrow"])
            .enter().append("marker")
            .attr("id", (d) => d)
            .attr("viewBox", "0 -5 10 20")
            .attr("refX", 40) // Controls the position of the arrowhead
            .attr("refY", 0)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .style("filter", "url(#dropShadow)")
            .append("path")
            .attr("d", (d) => {
                if (d === "reverse-arrow") {
                    return "M15,-5L0,0L15,5"; // Reverse the arrow path
                }
                return "M0,-5L15,0L0,5"; // Regular arrow path
            })
            .attr("fill", "url(#arrowGradient)"); // Arrow color

        svg.selectAll("marker path")
            .transition()
            .duration(2000) // Animation duration
            .ease(d3.easeElastic) // Elastic ease for smooth bounce effect
            .attr("transform", "scale(1.2)") // Scale up the arrow a little
            .transition()
            .duration(2000)
            .ease(d3.easeElastic)
            .attr("transform", "scale(1)"); // Return to normal size

        svg.append("defs").append("filter")
            .attr("id", "dropShadow")
            .append("feDropShadow")
            .attr("dx", 2)
            .attr("dy", 2)
            .attr("stdDeviation", 3)
            .attr("flood-color", "black")
            .attr("flood-opacity", 0.5);

        const link = svg
            .append("g")
            .attr("stroke", theme.palette.primary.light)
            .attr("stroke-opacity", 1)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", (d) => {
                console.log(d.target.id, "d.target.id")
                const wallet = categorizedWallets.find((wallet) => wallet.address == d.target.id);
                const transactionVolume = wallet?.txs.reduce((total, tx) => total + parseFloat(tx.value), 0) || 0;
                console.log(transactionVolume, "transactionVolume");
                return thicknessScale(transactionVolume);
            })
            .attr("stroke", (d) => {
                const wallet = categorizedWallets.find((wallet) => wallet.address === d.target.id);
                if (!wallet) return "#ffcc00"; // Default color if no wallet is found

                // Calculate incoming and outgoing volumes
                const incomingVolume = wallet.txs
                    .filter((tx) => tx.from === wallet.address)
                    .reduce((total, tx) => total + parseFloat(tx.value), 0);

                const outcomingVolume = wallet.txs
                    .filter((tx) => tx.to === wallet.address)
                    .reduce((total, tx) => total + parseFloat(tx.value), 0);

                // Determine the stroke color based on the net volume
                const netVolume = incomingVolume - outcomingVolume;
                if (netVolume > 0) return "#4CAF50"; // Positive net volume (incoming)
                if (netVolume < 0) return "#FF5733";   // Negative net volume (outgoing)
                return "#f4b400";
            })
            .attr("stroke-opacity", (d) => {
                // Find the target wallet and its transactions
                const wallet = categorizedWallets.find((wallet) => wallet.address === d.target.id);
                if (!wallet) return 0.2; // Default low opacity if no wallet is found

                // Assume transactions have a `timestamp` in Unix time (seconds)
                const mostRecentTimestamp = Math.max(...wallet.txs.map((tx) => new Date(tx.metadata.blockTimestamp).getTime()));
                const ageInSeconds = (Date.now() - mostRecentTimestamp) / 1000;

                console.log(mostRecentTimestamp, "mostRecentTimestamp", ageInSeconds, "ageInSeconds");

                // Define an opacity scale (e.g., recent = 1, old = 0.2)
                const opacityScale = d3.scaleLinear()
                    .domain([0, 60 * 60 * 24 * 30]) // From 0 to 30 days
                    .range([1, 0.3]) // Full opacity to faded
                    .clamp(true);

                return opacityScale(ageInSeconds);
            })
            .attr("marker-end", (d) => {
                const wallet = categorizedWallets.find((wallet) => wallet.address === d.target.id);
                if (!wallet) return "url(#arrow)"; // Default marker if no wallet is found

                // Find the most recent transaction
                const mostRecentTx = wallet.txs.reduce((latest, tx) => {
                    const txTime = new Date(tx.metadata.blockTimestamp).getTime();
                    return txTime > latest.timestamp ? { ...tx, timestamp: txTime } : latest;
                }, { timestamp: 0 });

                // Check if the transaction is outgoing or incoming to determine direction
                if (mostRecentTx.to === d.target.id) {
                    // If the most recent transaction is incoming to the target, set arrow from source to target
                    return "url(#arrow)";
                } else if (mostRecentTx.from === d.target.id) {
                    // If the most recent transaction is outgoing from the target, set arrow from target to source
                    return "url(#reverse-arrow)"; // This should reference a different marker for the reverse direction
                }
                return "url(#arrow)"; // Default marker if no transaction found
            })
            .attr("class", (d) => `link-${d.source.id}-${d.target.id}`);

        svg.selectAll(".arrow")
            .data(links)
            .enter()
            .append("circle")
            .attr("class", "arrow")
            .attr("r", 6) // Size of the arrow
            .attr("fill", "#00c6ff") // Arrow color
            .attr("cx", (d) => {
                const wallet = categorizedWallets.find((wallet) => wallet.address === d.target.id);

                // Find the most recent transaction
                const mostRecentTx = wallet.txs.reduce((latestTx, currentTx) => {
                    const latestTxTime = new Date(latestTx.metadata.blockTimestamp).getTime();
                    const currentTxTime = new Date(currentTx.metadata.blockTimestamp).getTime();
                    return currentTxTime > latestTxTime ? currentTx : latestTx;
                }, wallet.txs[0]); // Initial value to avoid error when `txs` is not empty

                // Determine arrow direction based on transaction
                const isIngoing = mostRecentTx.from === d.target.id;
                return isIngoing === true ? d.target.x : d.source.x
            }) // Starting position of the arrow (source)
            .attr("cy", (d) => {
                const wallet = categorizedWallets.find((wallet) => wallet.address === d.target.id);

                // Find the most recent transaction
                const mostRecentTx = wallet.txs.reduce((latestTx, currentTx) => {
                    const latestTxTime = new Date(latestTx.metadata.blockTimestamp).getTime();
                    const currentTxTime = new Date(currentTx.metadata.blockTimestamp).getTime();
                    return currentTxTime > latestTxTime ? currentTx : latestTx;
                }, wallet.txs[0]); // Initial value to avoid error when `txs` is not empty

                // Determine arrow direction based on transaction
                const isIngoing = mostRecentTx.from === d.target.id;
                return isIngoing === true ? d.target.y : d.source.y
            })
            .transition()
            .duration(5000) // Duration of one arrow movement (5 seconds)
            .ease(d3.easeLinear)
            .style("opacity", 0)
            .attrTween("transform", function (d) {
                const wallet = categorizedWallets.find((wallet) => wallet.address === d.target.id);

                // Find the most recent transaction
                const mostRecentTx = wallet.txs.reduce((latestTx, currentTx) => {
                    const latestTxTime = new Date(latestTx.metadata.blockTimestamp).getTime();
                    const currentTxTime = new Date(currentTx.metadata.blockTimestamp).getTime();
                    return currentTxTime > latestTxTime ? currentTx : latestTx;
                }, wallet.txs[0]); // Initial value to avoid error when `txs` is not empty

                // Determine arrow direction based on transaction
                const isOutgoing = mostRecentTx.from === d.target.id;

                // Update arrow's direction based on the transaction flow
                const xStart = isOutgoing ? d.target.x : d.source.x;
                const yStart = isOutgoing ? d.target.y : d.source.y;
                const xEnd = isOutgoing ? d.source.x : d.target.x;
                const yEnd = isOutgoing ? d.source.y : d.target.y;

                return function (t) {
                    const x = xStart + (xEnd - xStart) * t;
                    const y = yStart + (yEnd - yStart) * t;
                    return `translate(${x}, ${y})`;
                };
            })

        const maxBalance = Math.max(...nodes.map((node) => node.balance));
        const minBalance = 0;
        const minRadius = 10;
        const maxRadius = 30;

        const radiusScale = d3.scaleLog()
            .domain([minBalance + 1, maxBalance + 1])
            .range([minRadius, maxRadius]);

        const node = svg
            .append("g")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", (d) => (radiusScale(d.balance + 1)))
            .attr("fill", (d) => {
                console.log(`Determining fill color for node ${d.id}`);
                if (d.isMainWallet) {
                    console.log(`Node ${d.id} is a main wallet`);
                    return '#FF5733'; // Main wallet
                }
                const wallet = categorizedWallets.find((wallet) => wallet.address == d.id);
                console.log(`Categorized wallet for node ${d.id}:`, wallet);

                if (wallet?.category === "Smart Contract") {
                    console.log(`Node ${d.id} is a smart contract`);
                    return 'white';
                } else if (wallet?.profitability !== undefined && wallet?.profitability !== 0) {
                    const normalizedProfitability = wallet.profitability / maxProfitability;
                    console.log(`Node ${d.id} normalized profitability: ${normalizedProfitability}`);
                    const adjustedProfitability = Math.max(normalizedProfitability, 0.5);
                    if (normalizedProfitability > 0) {
                        console.log(`Node ${d.id} has positive profitability: ${wallet.profitability}`);
                        return d3.interpolateGreens(adjustedProfitability);
                    } else {
                        console.log(`Node ${d.id} has negative profitability: ${wallet.profitability}`);
                        return d3.interpolateReds(Math.abs(adjustedProfitability));
                    }
                }

                console.log(`Node ${d.id} is neutral`);
                return '#5DADE2'; // Neutral
            }
            )
            .style("opacity", (d) => {
                if (d.isMainWallet) {
                    console.log(`Node ${d.id} is a main wallet`);
                    return 1; // Main wallet always has full opacity
                } else {
                    const wallet = categorizedWallets.find((wallet) => wallet.address == d.id);
                    if (wallet) {
                        const normalizedActivity = wallet.txs.length / maxActivityFrequency;
                        const adjustedOpacity = Math.max(normalizedActivity, 0.5); // Ensure opacity is at least 0.5
                        console.log(`Node ${d.id} normalized activity: ${normalizedActivity}, adjusted opacity: ${adjustedOpacity}`);
                        return adjustedOpacity;
                    }
                    console.log(`Node ${d.id} has no wallet data`);
                    return 0.5; // Default minimum opacity for nodes with no wallet data
                }
            })
            .attr("stroke", (d) =>
                d.id === clickedNodeId
                    ? theme.palette.secondary.main
                    : theme.palette.secondary.light
            )
            .attr("stroke-width", (d) => (d.id === clickedNodeId ? 4 : d.isMainWallet ? 10 : 2))
            .attr("class", (d) => `node-${d.id}`)
            .call(d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            )
            .on("click", async (event, d) => {
                setClickedNodeId(d.id);
                setTooltip({
                    content: `<span style="font-size: 16px; font-weight: bold; color: #4CAF50;">Address:</span>
                              <span style="font-size: 14px; color: #E0E0E0;">${d.address || 'N/A'}</span></br>
                              <span style="font-weight: bold; color: #FF9800;">Loading additional data...</span>`
                });
                console.log("r", radiusScale(d.balance + 1), d.balance)
                const response = await fetch(`${SEVER_URL}/api/wallet/data`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // Indicate that we're sending JSON data
                    },
                    body: JSON.stringify({
                        address: d.address,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
                }

                const totalBalance = await response.json(); // Assuming the backend returns JSON data

                console.log(totalBalance, "totalBalance")

                const wallet = categorizedWallets.find((wallet) => wallet.address == d.id);

                const transactions = wallet.txs;

                const profitability = wallet.profitability;

                function getProfitabilityColor(value) {
                    if (value > 0) return "green"; // Positive: Green
                    if (value < 0) return "red";   // Negative: Red
                    return "gray";                 // Zero: Gray
                }

                setTooltip({
                    content: `
                        <div style="font-size: 14px; color: #E0E0E0;">
                            <span style="font-size: 16px; font-weight: bold; color: #4CAF50;">Address:</span>
                             <a href="https://etherscan.io/address/${d.address}" target="_blank" style="font-size: 14px; color: #E0E0E0; word-wrap: break-word;">${d.address || 'N/A'}</a><br><br>

                            <span style="font-weight: bold; color: #FF9800;">💰 Number of Transactions: <span style="color:white;">${transactions.length}</span></span><br><br>

                            <span style="font-weight: bold; color: #FF9800;">💰 Profitability: <span style="color:${getProfitabilityColor(profitability)};">${profitability.toFixed(4)}</span></span><br><br>

                            <span style="font-weight: bold; color: #FF9800;">💰 Total Balance:</span><br>
                            <span>Native Balance: <span style="color: #E0E0E0;">${totalBalance.nativeBalance} ETH</span></span><br><br>
                            
                            <span style="font-weight: bold; color: #FF9800;">💰 Token Balances:</span><br>
                            ${totalBalance.tokenBalances.map(token => `
                                <div>
                                    <span style="color: #E0E0E0;">${token.tokenSymbol}: <span style="color: #FFFFFF;">${token.balance}</span></span><br>
                                </div>
                            `).join('')}
                        </div>
                    `
                });

            });

        const text = svg
            .append("g")
            .selectAll("text")
            .data(nodes.filter((d) => d.isMainWallet))
            .join("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-size", "24px")
            .attr("fill", "white")
            .text("🎯");

        const icon = svg
            .append("g")
            .selectAll("text")
            .data(nodes.filter((d) =>
                d.id === clickedNodeId &&
                (
                    (visibilityMap[clickedNodeId] && visibilityMap[clickedNodeId] == true) ||
                    (visibilityMap[clickedNodeId] == null)
                )
            ))
            .join("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-size", "20px")
            .attr("fill", "white")
            .text("✔");

        simulation.on("tick", () => {
            link
                .attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
            text.attr("x", (d) => d.x).attr("y", (d) => d.y);

            icon
                .attr("x", (d) => d.x)
                .attr("y", (d) => d.y);
        });

        const zoom = d3.zoom().scaleExtent([1, 10]).on("zoom", (event) => {
            svg.attr("transform", event.transform);
        });

        svg.call(zoom);

        // When dragging starts, change cursor to 'grabbing'
        svg.on("mouseover", () => {
            svg.style("cursor", "grab");
        });

        svg.on("mousedown", () => {
            svg.style("cursor", "grabbing");
        });

        svg.on("mouseup", () => {
            svg.style("cursor", "grab");
        });

        svg.on("mouseleave", () => {
            svg.style("cursor", "default");
        });

        console.log('useEffect triggered, visibilityMap:', visibilityMap);
        // Update visibility for nodes and links
        nodes.forEach((node) => {
            const visibility = visibilityMap[node.id] !== false; // Default is true.
            svg
                .selectAll(`.node-${node.id}`)
                .style("opacity", visibility ? 1 : 0)
                .style("pointer-events", visibility ? "auto" : "none");
        });

        links.forEach((link) => {
            const sourceVisible = visibilityMap[link.source.id] !== false;
            const targetVisible = visibilityMap[link.target.id] !== false;
            const visibility = sourceVisible && targetVisible;
            svg
                .selectAll(
                    `.link-${link.source.id}-${link.target.id}`
                )
                .style("opacity", visibility ? 1 : 0)
                .style("pointer-events", visibility ? "auto" : "none");
        });

    }, [rawData, theme, clickedNodeId, visibilityMap]);

    console.log(clickedNodeId, visibilityMap[clickedNodeId], "clickedNodeId, visibilityMap[clickedNodeId]")

    const toggleVisibility = (wallet) => {
        console.log('Toggling visibility for:', wallet.address);

        setVisibilityMap((prev) => {
            // Toggle the visibility based on the current visibility state
            const updatedVisibility = prev[wallet.address] !== false;
            console.log('Current visibilityMap before update:', prev);
            console.log('Updated visibility for wallet:', wallet.address, updatedVisibility ? 'hidden' : 'visible');

            const newVisibilityMap = {
                ...prev,
                [wallet.address]: updatedVisibility ? false : true,  // Toggle visibility
            };

            console.log('Updated visibilityMap:', newVisibilityMap);
            return newVisibilityMap;
        });
    };

    const selectWallet = async (wallet) => {
        try {
            // Step 1: Find the wallet node
            const walletNode = rawData.nodes.find(node => node.address === wallet.address);
            if (!walletNode) {
                console.error("Wallet node not found");
                return;
            }

            // Step 2: Update clicked node to highlight the wallet
            setClickedNodeId(walletNode.address);

            setTooltip({
                content: `<span style="font-size: 16px; font-weight: bold; color: #4CAF50;">Address:</span>
                          <span style="font-size: 14px; color: #E0E0E0;">${wallet.address || 'N/A'}</span></br>
                          <span style="font-weight: bold; color: #FF9800;">Loading additional data...</span>`
            });

            const response = await fetch(`${SEVER_URL}/api/wallet/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Indicate that we're sending JSON data
                },
                body: JSON.stringify({
                    address: wallet.address,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
            }

            const totalBalance = await response.json(); // Assuming the backend returns JSON data

            console.log(totalBalance, "totalBalance")

            const targetWallet = categorizedWallets.find((targetWallet) => targetWallet.address == walletNode.address);

            const transactions = targetWallet.txs;

            const profitability = targetWallet.profitability;

            function getProfitabilityColor(value) {
                if (value > 0) return "green"; // Positive: Green
                if (value < 0) return "red";   // Negative: Red
                return "gray";                 // Zero: Gray
            }

            setTooltip({
                content: `
                    <div style="font-size: 14px; color: #E0E0E0;">
                        <span style="font-size: 16px; font-weight: bold; color: #4CAF50;">Address:</span>
                         <a href="https://etherscan.io/address/${wallet.address}" target="_blank" style="font-size: 14px; color: #E0E0E0; word-wrap: break-word;">${wallet.address || 'N/A'}</a><br><br>

                         <span style="font-weight: bold; color: #FF9800;">💰 Number of Transactions: <span style="color:white;">${transactions.length}</span></span><br><br>

                         <span style="font-weight: bold; color: #FF9800;">💰 Profitability: <span style="color:${getProfitabilityColor(profitability)};">${profitability.toFixed(4)}</span></span><br><br>

                        <span style="font-weight: bold; color: #FF9800;">💰 Total Balance:</span><br>
                        <span>Native Balance: <span style="color: #E0E0E0;">${totalBalance.nativeBalance} ETH</span></span><br><br>
                        
                        <span style="font-weight: bold; color: #FF9800;">💰 Token Balances:</span><br>
                        ${totalBalance.tokenBalances.map(token => `
                            <div>
                                <span style="color: #E0E0E0;">${token.tokenSymbol}: <span style="color: #FFFFFF;">${token.balance}</span></span><br>
                            </div>
                        `).join('')}
                    </div>
                `
            });

        } catch (error) {
            console.error("Error in selectWallet:", error);
            // Step 7: Show an error in the tooltip if fetching fails
            setTooltip({
                content: `<span style="color: red; font-size: 14px;">Failed to load wallet data. Please try again later.</span>`
            });
        }
    };

    const filteredWallets = rawData.nodes
        ?.filter(wallet => wallet.address?.toLowerCase().includes(searchQuery.toLowerCase()))
        ?.sort((a, b) => b.balance - a.balance);

    return (
        <div
            style={{
                position: "relative",
                height: "65vh",
                background: "#05579f",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                padding: "16px",
                overflow: "hidden"
            }}
        >
            <svg ref={svgRef} style={{ width: "100%", height: "100%", position: "absolute" }}></svg>

            {/* Conditional rendering for the button or wallet list */}
            {!showWallets ? (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setShowWallets(true)}
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        zIndex: 10
                    }}
                >
                    Wallets List
                </Button>
            ) : (
                <Box
                    sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "30%",
                        maxHeight: "65vh",
                        minHeight: "65vh",
                        display: "flex",
                        flexDirection: "column",
                        padding: 2,
                        paddingRight: 0,
                        borderRadius: 2,
                        boxShadow: 3,
                        bgcolor: "rgba(35, 48, 68, 0.85)", // Slight transparency
                        color: "text.primary"
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Wallets List
                        </Typography>
                        <IconButton color="primary" onClick={() => { setShowWallets(false), setSearchQuery('') }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Box sx={{ display: "flex", marginBottom: 1 }}>
                        <TextField
                            label="Search Wallet"
                            variant="outlined"
                            size="small"
                            onChange={(e) => setSearchQuery(e.target.value)}
                            fullWidth
                        />
                        <IconButton color="primary">
                            <SearchIcon />
                        </IconButton>
                    </Box>
                    <Paper
                        sx={{
                            backgroundColor: "transparent", // Make paper transparent
                            boxShadow: "none",
                            overflowY: "auto",
                            maxHeight: "56vh",
                            minHeight: "56vh",
                            '&::-webkit-scrollbar': {
                                width: '8px',  // Set scrollbar width
                                backgroundColor: 'transparent', // Make the scrollbar track transparent
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: '#888',  // Set color of the thumb
                                borderRadius: '4px', // Rounded edges for the thumb
                                transition: 'background-color 0.3s', // Smooth transition effect
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                backgroundColor: '#555',  // Darker thumb color on hover
                            },
                            '&::-webkit-scrollbar-track': {
                                backgroundColor: 'rgba(0, 0, 0, 0.1)',  // Track background color
                                borderRadius: '4px',  // Rounded track edges
                            }
                        }}
                    >
                        <ul style={{ padding: 0, listStyleType: "none" }}>
                            {filteredWallets?.map((wallet, index) => (
                                <li key={index} onClick={() => selectWallet(wallet)} >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "8px 0",
                                            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
                                            backgroundColor: wallet.address === clickedNodeId ? "rgb(54 101 175)" : "transparent",
                                            color: wallet.address === clickedNodeId ? theme.palette.primary.contrastText : "inherit",
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 'bold' }}>
                                            #{index + 1} {/* Display number before the address */}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "text.primary" }}>
                                            {wallet.address
                                                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                                                : "Unnamed Wallet"}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: "text.secondary", fontSize: "12px" }}
                                        >
                                            {wallet.balance ? `${parseFloat(wallet.balance).toFixed(4)} ETH` : "0.0000 ETH"}
                                        </Typography>
                                        <IconButton onClick={() => toggleVisibility(wallet)}>
                                            {Array.isArray(visibilityMap[wallet.address]) && visibilityMap[wallet.address].length === 0 ? (
                                                <Visibility />  // Display <Visibility /> if the visibilityMap[wallet.address] is an empty array
                                            ) : visibilityMap[wallet.address] == false ? (
                                                <VisibilityOff />  // Display <VisibilityOff /> if visibilityMap[wallet.address] is true
                                            ) : (
                                                <Visibility />  // Default, display <Visibility /> if visibilityMap[wallet.address] is false or undefined
                                            )}
                                        </IconButton>
                                    </Box>
                                </li>

                            ))}
                        </ul>
                    </Paper>
                </Box>
            )}

            {tooltip && (
                <div
                    style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        background: "rgba(35, 48, 68, 0.5)", // Transparent background
                        color: "white",
                        padding: "10px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        width: "300px", // Fixed width
                        height: "65vh", // Fixed height
                        overflow: "hidden", // Hide default scrollbar
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            overflowY: "auto", // Enable scrolling for the content
                            paddingRight: "10px", // Provide space for custom scrollbar
                            scrollbarWidth: "thin", // For Firefox: thin scrollbar
                            scrollbarColor: "#4e5d6e #2d3a46", // Custom scrollbar color (thumb and track)
                        }}
                        dangerouslySetInnerHTML={{ __html: tooltip.content }}
                    />
                </div>
            )}

        </div>
    );
};

export default BubbleMap;
