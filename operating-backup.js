(function() {
    'use strict';
    
    
    var kobelcoRequipID = null;
    var kobelcoItems = [{
            value:'すべて',
            label:'すべて',
            isDisabled:false,
        }];
    var project_datas = [];
    const geocode_url = 'https://www.geocoding.jp/api/';
    const available_distance = 1000;
    const isYearSumVisible = false;
    var monthSumDatas = [];
    
    kintone.events.on('app.record.index.show', function(event) {
      
      const sumBtn = document.createElement('button');
      sumBtn.id = "condition_reset_btn";
      sumBtn.textContent = '年、月別合計';
      sumBtn.style = "width: 150px; background: #3498db; border: none; height: 46px; color: white; float:right; margin-left:46px";
      // Retrieve the header menu space element and set the button there
      if (document.getElementById('condition_reset_btn') == null) {            
          kintone.app.getHeaderMenuSpaceElement().appendChild(sumBtn);
      }        
      
      sumBtn.onclick = function () {
          if(kobelcoRequipID==null||kobelcoRequipID=='すべて') {
            alert('重機データを選択してください。');
            return;
          }
          console.log('clicked..')
          show_DetailSum_Popup();
        };
      
      console.log('current query ',kintone.app.getQueryCondition());
      var query_consition = kintone.app.getQueryCondition();
      if(query_consition&&query_consition.includes('EquipmentID = ')){
        var equip_id = query_consition.split('=')[1].trim().split('"')[1].replace('"','');
        console.log('equip_id ',query_consition, equip_id);
        kobelcoRequipID = equip_id;
      }else{
         kobelcoRequipID = 'すべて';
      }
      
      var body = {
        'app':385,
        'query':'Created_datetime = YESTERDAY() order by $id asc offset 0'
      } 
      kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', body, function(resp) {
        // success      
            resp.records.forEach((item, index)=>{
            if(item.EquipmentID.value&&item.EquipmentID.value!=''){
                kobelcoItems.push({
                  value:item.EquipmentID.value,
                  label:item.EquipmentID.value,
                  isDisabled:false,
              })}
            }); 
            console.log('disp_records: ',kobelcoItems);
            
            var kobelcoDropdown = new kintoneUIComponent.Dropdown({
                items: kobelcoItems,
                value: kobelcoRequipID
            });
            kobelcoDropdown.on('change', function (event) {
              kobelcoRequipID = event;
              console.log('location',window.location.href.split('?')[0],event);
              console.log('current query ',kintone.app.getQueryCondition());
              const url_base_path = window.location.href.split('?')[0];
              const urlParams = new URLSearchParams(window.location.search);
              const view_Str = urlParams.get('view')??8241124;
              // if(view_Str==null){alert('');return;}
              const keyword_Str = urlParams.get('keyword');
              console.log('Value of view:', view_Str);
              console.log('Value of keyword:', keyword_Str);
              if(event!='すべて'){
                  const newQuery =`f8241835="${event}"`;
                  const newUrlString = `${url_base_path}?`+ new URLSearchParams(`view=${view_Str}&q=${newQuery}`);
                  const newUrl = new URL(newUrlString)
                  window.location.href = newUrl;
                  console.log('new url  ', newUrl,newUrlString)
                  //window.location.reload();
              }else{
                  const newUrlString = `${url_base_path}?`+ new URLSearchParams(`view=${view_Str}`);
                  const newUrl = new URL(newUrlString)
                  window.location.href = newUrl;
              }
            });
            
            // Retrieve the header menu space element and set the button there
            if (document.getElementById('kobelco_dropdown') == null) {
                kintone.app.getHeaderMenuSpaceElement().appendChild(kobelcoDropdown.render());
            }
        }, function(error) {
            console.log('kobelco error', error);
        });
    });
    
    document.addEventListener("DOMContentLoaded", function (_e) {  
      kintone.events.on('app.record.create.show', event => {
        return event;
      }); 
      kintone.events.on(['app.record.detail.show'], function (event) {
        var record = event.record;
        console.log('record edit',record);   
        return event;
      });      
      kintone.events.on(['app.record.edit.show'], function (event) {
        return event;
      });      
      kintone.events.on(['app.record.create.submit', 'app.record.index.edit.submit', 'app.record.edit.submit'], function (event) {         
        const record = event.record;
        return event;
      });
        
    });

    
    function displayMonthData(){
        console.log('kobelcoRequipID ',kobelcoRequipID);
        if(monthSumDatas.length){
            addingTableDisplay(monthSumDatas,kobelcoRequipID)
        }else{
            fetchRecordsByEquip("385",kobelcoRequipID).then(function (operating_resp) {
                console.log('operating_resp ',operating_resp)
                var yearMonth = operating_resp.length?operating_resp[0].Kobelco_Time.value.slice(0,7):"";
                var fuel24_consumed=0;
                var operation_hours=0;
                var operating_three=0;
                monthSumDatas = [];
                operating_resp.forEach(item=>{
                    var item_year_month = operating_resp[0].Kobelco_Time.value.slice(0,7);
                    if(yearMonth!=item_year_month){
                        monthSumDatas.push({
                            'year_month':yearMonth,
                            'fuel24_consumed' : fuel24_consumed,
                            'operation_hours' : operation_hours.toFixed(2),
                            'operating_three' : operating_three
                        })
                        fuel24_consumed = parseInt(item.fuel24_consumed.value);
                        operation_hours = parseFloat(item.operation_hours.value);
                        operating_three = item.operating_three.value!=''?1:0;
                        yearMonth = item_year_month;
                    }else{
                        fuel24_consumed += parseInt(item.fuel24_consumed.value);
                        operation_hours += parseFloat(item.operation_hours.value);
                        operating_three = item.operating_three.value!=''?operating_three+1:operating_three;
                    }
                })
                if(monthSumDatas.length==0&&operating_resp.length){
                    monthSumDatas.push({
                        'year_month':yearMonth,
                        'fuel24_consumed' : fuel24_consumed,
                        'operation_hours' : operation_hours.toFixed(2),
                        'operating_three' : operating_three
                    })
                }
                console.log('monthSumDatas ',monthSumDatas);
                addingTableDisplay(monthSumDatas,kobelcoRequipID, 'month')
            });
        }
    }

    function displayYearData(){
        console.log('kobelcoRequipID ',kobelcoRequipID);
        var yearDatas = [];
       
        var fuel24_consumed=0;
        var operation_hours=0;
        var operating_three=0;
        var yearMonth = monthSumDatas.length?monthSumDatas[0].year_month.slice(0,4):"";
        monthSumDatas.forEach(item=>{
            var item_year_month = item.year_month.slice(0,4);
            if(yearMonth!=item_year_month){
                yearDatas.push({
                    'year_month':yearMonth,
                    'fuel24_consumed' : fuel24_consumed,
                    'operation_hours' : parseFloat(operation_hours).toFixed(2),
                    'operating_three' : operating_three
                })
                fuel24_consumed =item.fuel24_consumed;
                operation_hours = parseFloat(item.operation_hours);
                operating_three = item.operating_three;
                yearMonth = item_year_month;
            }else{
                fuel24_consumed += item.fuel24_consumed;
                operation_hours += parseFloat(item.operation_hours);
                operating_three = item.operating_three;
            }
        })
        if(yearDatas.length==0){
            yearDatas.push({
                'year_month':yearMonth,
                'fuel24_consumed' : fuel24_consumed,
                'operation_hours' : parseFloat(operation_hours).toFixed(2),
                'operating_three' : operating_three
            })
        }
        console.log('monthSumDatas ',monthSumDatas);
        addingTableDisplay(yearDatas,kobelcoRequipID, 'year')
       
    }

    function addingTableDisplay(_datas, equip_id, _duration){
        const control_part = document.getElementById('control-part');
         $('#control-part').empty();
        const header_data = _duration=='year'? ['年別','装置ID','稼働時間','３時間位上稼働','消費燃料']: ['毎月','装置ID','稼働時間','３時間位上稼働','消費燃料'];
        const table = document.createElement('table');
        table.style = "width: -webkit-fill-available; margin-top:10px"

        control_part.appendChild(table);

        const headerRow = document.createElement('tr');
        headerRow.style = "height: 35px;background-color: gainsboro;";
        header_data.forEach(headerCellText => {
            const headerCell = document.createElement('th');
            headerCell.style = "width:20%"
            headerCell.textContent = headerCellText;
            headerRow.appendChild(headerCell);
        });
        table.appendChild(headerRow);

        const tbody = document.createElement('tbody');
        tbody.style = "text-align:center;";
        _datas.forEach(rowData => {
            const row = document.createElement('tr');
            row.style = "height: 30px; border: solid 1px #e9e0e0;";
            var cell = document.createElement('td');
            cell.textContent = rowData.year_month;
            row.appendChild(cell);

            var cell = document.createElement('td');
            cell.textContent = equip_id;
            row.appendChild(cell);

            var cell = document.createElement('td');
            cell.textContent = rowData.operation_hours;
            row.appendChild(cell);

            var cell = document.createElement('td');
            cell.textContent = rowData.operating_three;
            row.appendChild(cell);

            var cell = document.createElement('td');
            cell.textContent = rowData.fuel24_consumed;
            row.appendChild(cell);
         
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
    }
  
    function fetchRecords(appId, opt_offset, opt_limit, opt_records) {
      var offset = opt_offset || 0;
      var limit = opt_limit || 100;
      var allRecords = opt_records || [];
      var params = appId==233||appId==234?{ app: appId, query: ' order by $id asc limit ' + limit + ' offset ' + offset }:{ app: appId, query: 'order by sort_num asc limit ' + limit + ' offset ' + offset };
      return kintone.api('/k/v1/records', 'GET', params).then(function (resp) {
        allRecords = allRecords.concat(resp.records);
        if (resp.records.length === limit) {
          return fetchRecords(appId, offset + limit, limit, allRecords);
        }
        return allRecords;
      });
    }

    function fetchRecordsByEquip(appId, equipment_id, opt_offset, opt_limit, opt_records) {
        var offset = opt_offset || 0;
        var limit = opt_limit || 100;
        var allRecords = opt_records || [];
        var params = { app: appId, query: 'EquipmentID = "'+equipment_id+'" order by $id asc limit ' + limit + ' offset ' + offset };
        return kintone.api('/k/v1/records', 'GET', params).then(function (resp) {
          allRecords = allRecords.concat(resp.records);
          if (resp.records.length === limit) {
            return fetchRecords(appId, offset + limit, limit, allRecords);
          }
          return allRecords;
        });
      }
    
    function getDistanceFromLatLonInMeter(lat1, lon1, lat2, lon2) {
      const R = 6371*1000; // Earth's radius in meters
    
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
    
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
      const distance = R * c;
    
      return distance;
    }
    
    function deg2rad(deg) {
      return deg * (Math.PI / 180);
    }
    
    function show_DetailSum_Popup(){        
      var spinner = new kintoneUIComponent.Spinner({ isVisible: false });
      const doc = document.getElementsByTagName("BODY")[0];
      doc.style = "overflow: hidden;";
      window.scrollTo(0, 0);
      const container = document.createElement('div');
      container.id = "disposal_modal_container";
      container.style = "display: block;position: absolute;top: 64px;left: 0;width: 100%;height: 100%;z-index: 10000;display: flex;justify-content: center;align-items: center;";
      const popupBg = document.createElement('div');
      popupBg.id = "disposal_modal_bg";
      popupBg.style = "position: absolute;background-color: rgba(0, 0, 0, 0.274);top: 0px;left: 0;width: 100%;height: 100%";
      container.appendChild(popupBg);
      popupBg.onclick = function () {
        document.getElementById("disposal_modal_container").outerHTML = "";
        doc.style = "overflow: auto;";     
        monthSumDatas = [];
      };
  
      const popupBody = document.createElement('div');
      popupBody.id = "disposal_modal_body";
      popupBody.style = "position: relative;padding: 30px;background: white;width: 1080px;min-height: 74%;max-height: 74%;display: flex;flex-direction: column;";
      
      const popupContent = document.createElement('div');
      popupContent.id = "disposal_modal_content";
      popupContent.style = "width: 100%;flex: 1; display:flex; flex-direction:column; justify-content:space-content";
      popupBody.appendChild(popupContent);
      const popupFooter = document.createElement('div');
      popupFooter.id = "disposal_modal_footer";
      popupFooter.style = "max-height: 50px;width: 100%;flex: 1;display: flex;justify-content: center;gap: 20px;";
      popupBody.appendChild(popupFooter);
      //-----------------------------------------footer----------------------------------------    
  
      container.appendChild(popupBody);
      doc.appendChild(container);
      
      let headerPart = document.createElement('div');
      headerPart.id = "header-part";
      headerPart.style = "padding:20px 10px auto;min-height: 50px;text-align: center;";
      popupContent.appendChild(headerPart);
      
      let titleLbl = document.createElement('label');
      titleLbl.style = "font-size:20px; font-weight:bold";
      titleLbl.innerHTML = "重機集計データ表示";
      headerPart.appendChild(titleLbl);
      
      let tabPart = document.createElement('div');
      tabPart.style = "display:flex; justify-content:center; gap:10px; margin-top:10px";
      headerPart.appendChild(tabPart);
      
      const monthBtn = document.createElement('button');
      monthBtn.id='month-tab';
      monthBtn.style = "background: #7cc1db; border: 2px solid #7cc1db;  border-radius: 4px;  padding: 4px 20px;  color: white; width:150px";
      monthBtn.innerHTML = "月別集計";
      tabPart.appendChild(monthBtn);
      monthBtn.onclick = function () {
        displayMonthData();     
        this.style = "background: #7cc1db; border: 2px solid #7cc1db;  border-radius: 4px;  padding: 4px 20px;  color: white; width:150px";
        $('#year-tab').css({
                            "background-color": "white",
                            "border": "2px solid #7cc1db",
                            "border-radius": "4px",
                            "color": "gray",
                            "width":"150px",
                            });
                                         
         
      }
      
      const yearBtn = document.createElement('button');
      yearBtn.id='year-tab';
      yearBtn.innerHTML="年別集計";
      yearBtn.style = "background: white; border: 2px solid #7cc1db;  border-radius: 4px;  padding: 4px 20px;  color: gray;  width:150px";
      tabPart.appendChild(yearBtn);
      yearBtn.onclick = function () {
        displayYearData();    
        this.style = "background: #7cc1db; border: 2px solid #7cc1db;  border-radius: 4px;  padding: 4px 20px;  color: white; width:150px";
        $('#month-tab').css({
                            "background-color": "white",
                            "border": "2px solid #7cc1db",
                            "border-radius": "4px",
                            "color": "gray",
                            "width":"150px",
                        });
      }
      
      
      const controlPart = document.createElement('div');
      controlPart.id = "control-part";
      controlPart.style = "width:auto; height:610px; margin: 0 50px;overflow-y: auto;";
      popupContent.appendChild(controlPart); 
      
     
      //-----------------------------------------footer----------------------------------------
  
      const completeButton = new kintoneUIComponent.Button({
        text: '閉じる',
        type: 'submit'
      });
      popupFooter.appendChild(completeButton.render());
      
      completeButton.on('click', function () {
        document.getElementById("disposal_modal_container").outerHTML = "";
        doc.style = "overflow: auto;";     
        monthSumDatas = [];
      });
      
      displayMonthData();  
      spinner.hide()
    }  
  
  })();
  