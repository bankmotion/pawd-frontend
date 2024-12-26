import React, { useEffect, useRef, useState } from "react";
import { useTheme } from '@mui/material/styles';
import * as d3 from "d3";

const BubbleMap = ({ rawData }) => {
    const theme = useTheme();
    const svgRef = useRef();
    const [tooltip, setTooltip] = useState({
        content: `<span style="font-size: 16px; font-weight: bold; color: #4CAF50;">Address:</span><span style="font-size: 14px; color: #E0E0E0; word-wrap: break-word;">${rawData.address || 'N/A'}</span></br><span style="font-weight: bold; color: #FF9800;">💰 Balance:</span> <span style="color: #E0E0E0;">${rawData.balance}</span>`
    });
    const [clickedNodeId, setClickedNodeId] = useState(null); // State to track clicked node

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
        return { nodes, links };
    };

    useEffect(() => {
        const { nodes, links } = transformData(rawData);

        // Set the main wallet as the default clicked node
        const mainWalletNode = nodes.find((node) => node.isMainWallet);
        if (mainWalletNode && !clickedNodeId) {
            setClickedNodeId(mainWalletNode.id);
        }

        const width = 800;
        const height = 600;

        const svg = d3
            .select(svgRef.current)
            .attr("viewBox", [0, 0, width, height])
            .style("font", "12px sans-serif");

        svg.selectAll("*").remove(); // Clear previous renders

        const simulation = d3
            .forceSimulation(nodes)
            .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2)) // Ensure center is correct
            .force("x", d3.forceX(width / 2).strength(0.1))  // Adding force to help center on X
            .force("y", d3.forceY(height / 2).strength(0.1)) // Adding force to help center on Y
            .alphaDecay(0.05); // Adjust the decay rate to stop the movement once the simulation settles

        const link = svg
            .append("g")
            .attr("stroke", theme.palette.primary.light)
            .attr("stroke-opacity", 0.8)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,2");

        const maxBalance = Math.max(...nodes.map((node) => node.balance)); // Find the maximum balance
        const minBalance = 0; // Set a minimum balance value, assuming a balance of 0
        const minRadius = 10; // Minimum radius for nodes with 0 balance
        const maxRadius = 30; // Maximum radius for nodes with the largest balance

        const radiusScale = d3.scaleLog()
        .domain([minBalance + 1, maxBalance]) // Ensure no logarithmic error for 0
        .range([minRadius, maxRadius]);

        const node = svg
            .append("g")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", (d) => (d.id === clickedNodeId ? 20 : d.isMainWallet ? 30 : radiusScale(d.balance + 1))) // Larger size for clicked bubble
            .attr("fill", (d) =>
                d.id === d.isMainWallet
                    ? '#FF5733' // Special color for main wallet
                    : d3.interpolateRainbow(d.group / 10)
            )
            .attr("stroke", (d) =>
                d.id === clickedNodeId
                    ? theme.palette.secondary.main
                    : theme.palette.secondary.light
            )
            .attr("stroke-width", (d) => (d.id === clickedNodeId ? 4 : d.isMainWallet ? 10 : 2)) // Thicker border for clicked bubble
            .on("click", (event, d) => {
                setClickedNodeId(d.id); // Set the clicked node as active
                setTooltip({
                    content: `<span style="font-size: 16px; font-weight: bold; color: #4CAF50;">Address:</span><span style="font-size: 14px; color: #E0E0E0; word-wrap: break-word;">${d.address || 'N/A'}</span></br><span style="font-weight: bold; color: #FF9800;">💰 Balance:</span> <span style="color: #E0E0E0;">${d.balance}</span>`,
                    x: event.pageX,
                    y: event.pageY
                });
            })
            .on("mousemove", (event) => {
                setTooltip((prev) => ({
                    ...prev,
                    x: event.pageX,
                    y: event.pageY,
                }));
            })
            .call(
                d3.drag()
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
            );

        node.append("title").text((d) => `Node: ${d.id}\nGroup: ${d.group}`);

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
            .data(nodes.filter((d) => d.id === clickedNodeId)) // Only the clicked node
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
    }, [rawData, theme, clickedNodeId]);

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "65vh",
                background: '#05579f',
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                padding: "16px",
                position: "relative",
            }}
        >
            <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>

            {/* Tooltip */}
            {tooltip && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        background: "rgb(35, 48, 68)",
                        color: "white",
                        padding: "8px",
                        borderRadius: "12px",
                        boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.3)",
                        pointerEvents: "none",
                        whiteSpace: "pre-wrap",
                        fontSize: "14px",
                        zIndex: 9999,
                        transition: "all 0.2s ease",
                    }}
                    dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
            )}
        </div>
    );
};

export default BubbleMap;
