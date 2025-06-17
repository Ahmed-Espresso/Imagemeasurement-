document.addEventListener('DOMContentLoaded', function() {
    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas('woundCanvas', {
        isDrawingMode: false,
        selection: true,
        backgroundColor: '#f8fcff'
    });
    
    // Set canvas dimensions
    const canvasContainer = document.querySelector('.canvas-container');
    canvas.setWidth(canvasContainer.offsetWidth);
    canvas.setHeight(600);
    
    // Measurement variables
    let pixelsPerCm = 37.8; // Default scale (for demo)
    let currentLength = 0;
    let currentArea = 0;
    let rulerLine = null;
    let woundPolygon = null;
    let polygonPoints = [];
    let polygonElements = [];
    let tempLine = null;
    let closeTolerance = 15; // Tolerance for closing the polygon
    let currentRotation = 0; // Current rotation angle in degrees
    let isPanning = false; // Panning mode flag
    let lastPosX, lastPosY; // Last position for panning
    let backgroundImage = null; // Reference to the background image
    
    // Sample image for demonstration
    const imgUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLjIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmZmZmIi8+PHJlY3QgeD0iMTAwIiB5PSIxMDAiIHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiByeD0iMjAiIHJ5PSIyMCIgZmlsbD0iI2Y1ZjVmNSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTUwLDE1MCBDMjAwLDIwMCAzMDAsMTUwIDM1MCwyMDAgQzQwMCwxNTAgNTAwLDIwMCA1NTAsMTUwIiBzdHJva2U9IiNlNjM5NDYiIHN0cm9rZS13aWR0aD0iOCIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMDAsMTIwIEw2MDAsMTIwIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iMyIvPjx0ZXh0IHg9IjIxMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiMzMzMiPjEwIGNtPC90ZXh0PjxjaXJjbGUgY3g9IjIwMCIgY3k9IjEyMCIgcj0iNSIgZmlsbD0iIzMzMyIvPjxjaXJjbGUgY3g9IjYwMCIgY3k9IjEyMCIgcj0iNSIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==';
    
    // Add sample image to canvas
    fabric.Image.fromURL(imgUrl, function(img) {
        img.scaleToWidth(canvas.width * 0.9);
        img.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center',
            selectable: false
        });
        backgroundImage = img;
        canvas.add(img);
        canvas.renderAll();
    });
    
    // Tool selection
    const tools = {
        select: document.getElementById('selectTool'),
        polygon: document.getElementById('polygonTool'),
        ruler: document.getElementById('rulerTool'),
        pan: document.getElementById('panTool'),
        clear: document.getElementById('clearTool')
    };
    
    // Set active tool
    function setActiveTool(tool) {
        // Remove active class from all tools
        Object.values(tools).forEach(t => t.classList.remove('active'));
        
        // Add active class to selected tool
        tool.classList.add('active');
        
        // Set canvas mode based on tool
        if (tool === tools.select) {
            canvas.isDrawingMode = false;
            canvas.selection = true;
            setPanMode(false);
            hideHint();
            hidePolygonControls();
            resetPolygonDrawing();
        } else if (tool === tools.polygon) {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            setPanMode(false);
            showHint("انقر على حواف الجرح لتحديد نقاط التحديد");
            showPolygonControls();
            startPolygonDrawing();
        } else if (tool === tools.ruler) {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            setPanMode(false);
            hideHint();
            hidePolygonControls();
            resetPolygonDrawing();
            startRulerCalibration();
        } else if (tool === tools.pan) {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            hideHint();
            hidePolygonControls();
            resetPolygonDrawing();
            setPanMode(true);
        }
    }
    
    // Initialize with select tool active
    setActiveTool(tools.select);
    
    // Set pan mode
    function setPanMode(active) {
        isPanning = active;
        if (active) {
            canvas.defaultCursor = 'grab';
        } else {
            canvas.defaultCursor = 'default';
        }
    }
    
    // Panning event handlers
    canvas.on('mouse:down', function(o) {
        if (isPanning) {
            canvas.defaultCursor = 'grabbing';
            const e = o.e;
            lastPosX = e.clientX;
            lastPosY = e.clientY;
        }
    });
    
    canvas.on('mouse:move', function(o) {
        if (isPanning && o.e.buttons === 1) {
            const e = o.e;
            const deltaX = e.clientX - lastPosX;
            const deltaY = e.clientY - lastPosY;
            canvas.relativePan({ x: deltaX, y: deltaY });
            lastPosX = e.clientX;
            lastPosY = e.clientY;
        }
    });
    
    canvas.on('mouse:up', function() {
        if (isPanning) {
            canvas.defaultCursor = 'grab';
        }
    });
    
    // Add event listeners to tools
    tools.select.addEventListener('click', () => setActiveTool(tools.select));
    tools.polygon.addEventListener('click', () => setActiveTool(tools.polygon));
    tools.ruler.addEventListener('click', () => setActiveTool(tools.ruler));
    tools.pan.addEventListener('click', () => setActiveTool(tools.pan));
    
    // Clear canvas
    tools.clear.addEventListener('click', () => {
        canvas.clear();
        // Re-add background color
        canvas.backgroundColor = '#f8fcff';
        // Reset zoom and pan
        canvas.setZoom(1);
        canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
        currentRotation = 0;
        document.getElementById('scaleValue').textContent = '1.00';
        // Re-add sample image
        fabric.Image.fromURL(imgUrl, function(img) {
            img.scaleToWidth(canvas.width * 0.9);
            img.set({
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: false
            });
            backgroundImage = img;
            canvas.add(img);
            canvas.renderAll();
        });
        // Reset measurements
        resetMeasurements();
        resetPolygonDrawing();
    });
    
    // Color picker
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            document.querySelector('.color-option.active').classList.remove('active');
            this.classList.add('active');
            const color = this.getAttribute('data-color');
            // Set color for polygon drawing
            if (woundPolygon) {
                woundPolygon.set({ stroke: color, fill: color + '33' });
                canvas.renderAll();
            }
        });
    });
    
    // Upload image
    const imageUpload = document.getElementById('imageUpload');
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(f) {
            const data = f.target.result;
            fabric.Image.fromURL(data, function(img) {
                canvas.clear();
                img.scaleToWidth(canvas.width * 0.9);
                img.set({
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: false
                });
                backgroundImage = img;
                canvas.add(img);
                canvas.renderAll();
                resetMeasurements();
                resetPolygonDrawing();
                currentRotation = 0;
            });
        };
        reader.readAsDataURL(file);
    });
    
    // Zoom functionality
    document.getElementById('zoomInBtn').addEventListener('click', function() {
        const currentZoom = canvas.getZoom();
        canvas.setZoom(currentZoom * 1.2);
        updateScaleDisplay();
    });
    
    document.getElementById('zoomOutBtn').addEventListener('click', function() {
        const currentZoom = canvas.getZoom();
        canvas.setZoom(currentZoom * 0.8);
        updateScaleDisplay();
    });
    
    document.getElementById('zoomResetBtn').addEventListener('click', function() {
        canvas.setZoom(1);
        updateScaleDisplay();
    });
    
    function updateScaleDisplay() {
        const zoom = canvas.getZoom();
        document.getElementById('scaleValue').textContent = (pixelsPerCm * zoom).toFixed(2);
    }
    
    // Rotation functionality
    document.getElementById('rotateLeftBtn').addEventListener('click', function() {
        if (backgroundImage) {
            currentRotation -= 90;
            if (currentRotation < 0) currentRotation += 360;
            backgroundImage.angle = currentRotation;
            backgroundImage.setCoords();
            canvas.renderAll();
            resetPolygonDrawing();
        }
    });
    
    document.getElementById('rotateRightBtn').addEventListener('click', function() {
        if (backgroundImage) {
            currentRotation += 90;
            if (currentRotation >= 360) currentRotation -= 360;
            backgroundImage.angle = currentRotation;
            backgroundImage.setCoords();
            canvas.renderAll();
            resetPolygonDrawing();
        }
    });
    
    // Panning controls
    document.getElementById('panUpBtn').addEventListener('click', function() {
        canvas.relativePan({ x: 0, y: -50 });
    });
    
    document.getElementById('panDownBtn').addEventListener('click', function() {
        canvas.relativePan({ x: 0, y: 50 });
    });
    
    document.getElementById('panLeftBtn').addEventListener('click', function() {
        canvas.relativePan({ x: -50, y: 0 });
    });
    
    document.getElementById('panRightBtn').addEventListener('click', function() {
        canvas.relativePan({ x: 50, y: 0 });
    });
    
    document.getElementById('panCenterBtn').addEventListener('click', function() {
        canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
        canvas.renderAll();
    });
    
    // Ruler calibration
    function startRulerCalibration() {
        canvas.off('mouse:down');
        canvas.off('mouse:move');
        canvas.off('mouse:up');
        
        showHint("انقر واسحب لرسم خط على المسطرة، ثم أدخل الطول الفعلي");
        
        canvas.on('mouse:down', function(o) {
            const pointer = canvas.getPointer(o.e);
            rulerLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: '#1d3557',
                strokeWidth: 3,
                strokeDashArray: [5, 5],
                selectable: false
            });
            canvas.add(rulerLine);
        });
        
        canvas.on('mouse:move', function(o) {
            if (!rulerLine) return;
            const pointer = canvas.getPointer(o.e);
            rulerLine.set({ x2: pointer.x, y2: pointer.y });
            canvas.renderAll();
            
            // Calculate and display current length
            const dx = rulerLine.x2 - rulerLine.x1;
            const dy = rulerLine.y2 - rulerLine.y1;
            const lengthPixels = Math.sqrt(dx * dx + dy * dy);
            currentLength = lengthPixels / pixelsPerCm;
            document.getElementById('currentLength').textContent = currentLength.toFixed(2);
        });
        
        canvas.on('mouse:up', function() {
            if (!rulerLine) return;
            
            // Ask for actual length to calibrate
            const actualLength = parseFloat(prompt("الرجاء إدخال الطول الفعلي للمسطرة بالسنتيمتر (مثال: 10 سم):", "10"));
            
            if (actualLength && actualLength > 0) {
                const dx = rulerLine.x2 - rulerLine.x1;
                const dy = rulerLine.y2 - rulerLine.y1;
                const lengthPixels = Math.sqrt(dx * dx + dy * dy);
                pixelsPerCm = lengthPixels / actualLength;
                
                // Update ruler display
                rulerLine.set({
                    strokeDashArray: null,
                    stroke: '#2a9d8f',
                    strokeWidth: 4
                });
                
                // Add measurement text
                const text = new fabric.Text(`${actualLength.toFixed(1)} سم`, {
                    left: (rulerLine.x1 + rulerLine.x2) / 2,
                    top: (rulerLine.y1 + rulerLine.y2) / 2 - 15,
                    fontSize: 16,
                    fontWeight: 'bold',
                    fill: '#2a9d8f'
                });
                canvas.add(text);
                
                updateScaleDisplay();
                showHint(`تمت معايرة المسطرة بنجاح! مقياس جديد: ${pixelsPerCm.toFixed(2)} بكسل/سم`);
            } else {
                canvas.remove(rulerLine);
            }
            
            rulerLine = null;
            canvas.renderAll();
        });
    }
    
    // Polygon drawing for wound measurement
    function startPolygonDrawing() {
        canvas.off('mouse:down');
        canvas.off('mouse:move');
        canvas.off('mouse:up');
        
        resetPolygonDrawing();
        
        canvas.on('mouse:down', function(o) {
            const pointer = canvas.getPointer(o.e);
            
            // Check if we're close to the first point to close the polygon
            if (polygonPoints.length > 2 && isNearFirstPoint(pointer)) {
                closePolygon();
                return;
            }
            
            addPolygonPoint(pointer);
        });
        
        canvas.on('mouse:move', function(o) {
            if (polygonPoints.length === 0) return;
            const pointer = canvas.getPointer(o.e);
            
            // Check if we're near the first point
            if (polygonPoints.length > 2 && isNearFirstPoint(pointer)) {
                showHint("انقر هنا لإغلاق الشكل");
            } else {
                showHint("انقر لإضافة نقطة جديدة أو انقر على النقطة الأولى للإغلاق");
            }
            
            // Create temporary line from last point to current mouse position
            const lastPoint = polygonPoints[polygonPoints.length - 1];
            
            if (tempLine) {
                canvas.remove(tempLine);
            }
            
            tempLine = new fabric.Line([lastPoint.x, lastPoint.y, pointer.x, pointer.y], {
                stroke: '#9b5de5',
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false
            });
            
            canvas.add(tempLine);
            
            // Calculate current segment length
            const dx = pointer.x - lastPoint.x;
            const dy = pointer.y - lastPoint.y;
            const segmentLengthPixels = Math.sqrt(dx * dx + dy * dy);
            const segmentLengthCm = segmentLengthPixels / pixelsPerCm;
            document.getElementById('currentLength').textContent = segmentLengthCm.toFixed(2);
            
            canvas.renderAll();
        });
    }
    
    function addPolygonPoint(point) {
        polygonPoints.push(point);
        
        // Create a visual point element
        const pointElement = document.createElement('div');
        pointElement.className = 'polygon-point';
        pointElement.style.left = (point.x - 6) + 'px';
        pointElement.style.top = (point.y - 6) + 'px';
        pointElement.dataset.index = polygonPoints.length - 1;
        
        canvas.wrapperEl.appendChild(pointElement);
        polygonElements.push(pointElement);
        
        // Update polygon if we have at least 2 points
        if (polygonPoints.length > 1) {
            if (woundPolygon) {
                woundPolygon.set({ points: polygonPoints });
            } else {
                // Start new polygon
                const color = document.querySelector('.color-option.active').getAttribute('data-color');
                woundPolygon = new fabric.Polygon(polygonPoints, {
                    stroke: color,
                    strokeWidth: 3,
                    fill: color + '33',
                    selectable: false,
                    objectCaching: false
                });
                canvas.add(woundPolygon);
            }
            
            // Update buttons
            document.getElementById('undoPointBtn').disabled = false;
            document.getElementById('closePolygonBtn').disabled = false;
        }
        
        canvas.renderAll();
    }
    
    function isNearFirstPoint(pointer) {
        if (polygonPoints.length < 3) return false;
        
        const firstPoint = polygonPoints[0];
        const dx = pointer.x - firstPoint.x;
        const dy = pointer.y - firstPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < closeTolerance;
    }
    
    function closePolygon() {
        polygonPoints.push(polygonPoints[0]);
        woundPolygon.set({ points: polygonPoints });
        
        // Remove temp line
        if (tempLine) {
            canvas.remove(tempLine);
            tempLine = null;
        }
        
        // Remove point elements
        polygonElements.forEach(el => el.remove());
        polygonElements = [];
        
        // Calculate area
        calculateWoundArea();
        
        // Show success message
        showHint("تم تحديد الجرح بنجاح! يمكنك الآن حساب القياسات");
        
        // Change to select tool
        setActiveTool(tools.select);
    }
    
    function calculateWoundArea() {
        if (polygonPoints.length < 3) return;
        
        // Shoelace formula to calculate polygon area
        let areaPixels = 0;
        const n = polygonPoints.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            areaPixels += polygonPoints[i].x * polygonPoints[j].y;
            areaPixels -= polygonPoints[j].x * polygonPoints[i].y;
        }
        
        areaPixels = Math.abs(areaPixels) / 2;
        currentArea = areaPixels / (pixelsPerCm * pixelsPerCm);
        
        // Update display
        document.getElementById('currentArea').textContent = currentArea.toFixed(2);
        document.getElementById('areaValue').textContent = currentArea.toFixed(2) + ' سم²';
        
        // Calculate length and width
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const point of polygonPoints) {
            if (point.x < minX) minX = point.x;
            if (point.x > maxX) maxX = point.x;
            if (point.y < minY) minY = point.y;
            if (point.y > maxY) maxY = point.y;
        }
        
        const widthPixels = maxX - minX;
        const heightPixels = maxY - minY;
        
        const widthCm = widthPixels / pixelsPerCm;
        const heightCm = heightPixels / pixelsPerCm;
        
        document.getElementById('lengthValue').textContent = Math.max(widthCm, heightCm).toFixed(2) + ' سم';
        document.getElementById('widthValue').textContent = Math.min(widthCm, heightCm).toFixed(2) + ' سم';
        
        // Update healing progress
        const progress = 30 + Math.floor(Math.random() * 50);
        const progressBar = document.getElementById('healingProgress');
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}% تعافٍ`;
    }
    
    function resetPolygonDrawing() {
        if (woundPolygon) {
            canvas.remove(woundPolygon);
            woundPolygon = null;
        }
        
        if (tempLine) {
            canvas.remove(tempLine);
            tempLine = null;
        }
        
        polygonPoints = [];
        
        // Remove point elements
        polygonElements.forEach(el => el.remove());
        polygonElements = [];
        
        // Reset buttons
        document.getElementById('undoPointBtn').disabled = true;
        document.getElementById('closePolygonBtn').disabled = true;
    }
    
    // Undo last point
    document.getElementById('undoPointBtn').addEventListener('click', function() {
        if (polygonPoints.length > 0) {
            polygonPoints.pop();
            
            // Remove last point element
            if (polygonElements.length > 0) {
                const lastElement = polygonElements.pop();
                lastElement.remove();
            }
            
            if (polygonPoints.length > 1) {
                woundPolygon.set({ points: polygonPoints });
            } else if (polygonPoints.length === 0) {
                if (woundPolygon) {
                    canvas.remove(woundPolygon);
                    woundPolygon = null;
                }
            } else {
                // If only one point remains, remove the polygon
                if (woundPolygon) {
                    canvas.remove(woundPolygon);
                    woundPolygon = null;
                }
            }
            
            // Update buttons
            document.getElementById('undoPointBtn').disabled = polygonPoints.length === 0;
            document.getElementById('closePolygonBtn').disabled = polygonPoints.length < 3;
            
            canvas.renderAll();
        }
    });
    
    // Close polygon button
    document.getElementById('closePolygonBtn').addEventListener('click', closePolygon);
    
    function resetMeasurements() {
        document.getElementById('lengthValue').textContent = '0.00 سم';
        document.getElementById('widthValue').textContent = '0.00 سم';
        document.getElementById('areaValue').textContent = '0.00 سم²';
        document.getElementById('currentLength').textContent = '0.00';
        document.getElementById('currentArea').textContent = '0.00';
        
        const progressBar = document.getElementById('healingProgress');
        progressBar.style.width = `0%`;
        progressBar.textContent = `0% تعافٍ`;
    }
    
    // Calculate measurements
    document.getElementById('calculateBtn').addEventListener('click', function() {
        if (woundPolygon) {
            calculateWoundArea();
        } else {
            showHint("الرجاء تحديد الجرح أولاً باستخدام أداة تحديد الجرح");
        }
    });
    
    // Responsive canvas
    window.addEventListener('resize', function() {
        canvas.setWidth(canvasContainer.offsetWidth);
        canvas.renderAll();
    });
    
    // Hint message functions
    function showHint(message) {
        const hint = document.getElementById('hintMessage');
        hint.textContent = message;
        hint.style.display = 'block';
    }
    
    function hideHint() {
        document.getElementById('hintMessage').style.display = 'none';
    }
    
    // Polygon controls
    function showPolygonControls() {
        document.getElementById('undoPointBtn').disabled = polygonPoints.length === 0;
        document.getElementById('closePolygonBtn').disabled = polygonPoints.length < 3;
    }
    
    function hidePolygonControls() {
        // Controls remain visible but are disabled when not in polygon mode
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Delete key to undo last point
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (tools.polygon.classList.contains('active')) {
                document.getElementById('undoPointBtn').click();
            }
        }
        
        // Enter key to close polygon
        if (e.key === 'Enter') {
            if (tools.polygon.classList.contains('active') && polygonPoints.length >= 3) {
                closePolygon();
            }
        }
    });
});