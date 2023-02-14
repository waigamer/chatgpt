'use strict';

const axios = require('axios').default;
const crypto = require('crypto');
const express = require('express');
const app = express();
const cors = require('cors');
const webSocketClient = require('websocket').client;
const Big = require('big.js');
const logger = require('./logger');
const fs = require("fs");
require('dotenv').config();
Big.DP=20;

const Okex = require("./okex.js");
const { getPriority } = require('os');
const { cli } = require('winston/lib/winston/config');
const { connection } = require('websocket');
const { ok } = require('assert');
const { SlowBuffer } = require('buffer');
const { stringify } = require('querystring');
const { exit } = require('process');
//const { isKeyObject } = require('util/types');
const okex = new Okex();

let checking = [];

let operations_status = [];

let operations_status_long = [];

let operations_status_short = [];

let operations_status_pause = [];

let operations = [];

let candlesLow =  [];

let candlesHigh = [];

let greenCandles = [];

let redCandles = [];

let minValuesOneMin = [];

let maxValuesOneMin = [];

let oneMinTimeStamp = [];

let minValuesFiveMin = [];

let maxValuesFiveMin = [];

let fiveMinTimeStamp = [];

let lastKindleSize = [];

let actualKindleSize = [];

let biggerKindleSize = [];

let kindleCounter = [];

let limbo = [];

let totalProfitit = new Big(0);

let totalCerrado = new Big(0);

let maxInversion = 0;

let stop = false;                

let stopOpening = false;

let closedProfit = new Big(0);

let pnl = new Big(0);

let totalCumm = new Big(0);

let stopOnNextClose = false;

let maxPNL = new Big(0);

let fees = new Big(0);

let transfered = new Big(0);

let makingTransfer = false;

let numOpsLong = 0;

let numOpsShort = 0;

let usdtAvaliable = new Big(0);

let test = true;                                //Si opera en real o modo test

let posibleInvest = new Big(0);                  //Cantidad total que puede invertir

let betQtyBase = new Big(25)                     //Bet inicial

let betQty = betQtyBase;      

let realBetQtyMultiplierLong = new Big(0.20);    // Multiplicador para calcular la bet incicial real.

let realBetQtyMultiplierShort = new Big(0.1);    // Multiplicador para calcular la bet incicial real.

let minInitialBet = new Big(process.env.initialBet);   

let maxInitialBet = minInitialBet;   

let closeWinBase = new Big(0);                  //Beneficio en el que cierra

let closeWin = closeWinBase;

let protectBigMovement = true;                  //Activar desactivar el algoritmo de protección movimientos fuertes

const qtyToTransfer = 0;                        //Cantidad de beneficio en el que transfiere directamente a spot

let timeBetweenLevelsLimit = 300000             //Limite de tiempo entre niveles. En milisegundos

let timeBetween3LevelsLimit = 1800000           //Limite de tiempo entre 3 niveles. En milisegundos

let limitInvestment = new Big(0);        

let limitInvestmentMultiplier = new Big(process.env.totalInvestLimit);                      //multiplicador sobre los USDT disponibles         5

let limitInvestmentPerPair = new Big(0);        

let limitInvestmentMultiplierPerPair = new Big(process.env.onePairLimitMultiplier);         //multiplicador sobre los USDT disponibles       

let startAmountLimitMultiplier = new Big(0.10);                                             // multiplicador sobre los USDT disponibles      0.12

let amountToStopOperatingAllPairsMultiplier = new Big(process.env.amountToStopOperatingAllPairsMultiplier); ;                                   // multiplicador sobre los USDT disponibles   0.7

let investLimitReached = false;

let percent4OneBox = new Big(process.env.percent4OneBox);

let amountToStartRealOp = 1000;

let amountToStartRealOpLong = 150  

let amountToStartRealOpLongEarly = 150      

let amountToStartRealOpShort = 1000

let numberPairsReady = 50  

let divideAndConquerActive = true;

let divideAndConquerValue = 0.25;

let divideAndConquerMaxCummValue = 800

//let divideAndConquerMaxCummValue = parseFloat(process.env.divideAndConquerEntryQty);

let divideAndConquerEntryPercent = parseFloat(process.env.divideAndConquerEntryPercent);

let secondDivideMultiplier = parseFloat(process.env.secondDivideMultiplier);

let thirdDivideMultiplier = parseFloat(process.env.thirdDivideMultiplier);

let minBetMultiplier = parseFloat(process.env.minBetMultiplier);

let amountToStopOperatingAllPairs = 40000;

let limitingops = false;

let realOpsStartAmount = new Big(0);

let realOpsStartAmountLimit = 1000;

let ready4RealLongOps = 0;

let ready4RealShortOps = 0;

let maxOpenPairs = parseFloat(process.env.maxOpenPairs);;

let openOperations = 0;

let simulatingLongPairs = 0;

let simulatingShortPairs = 0;

let moneyNeededByRealOps = new Big(0);

let lastMoneyNeeded = new Big(0);

let firstPairWhenLimiting = null;

let moneyInFridger = new Big(0);

let clientWsTimeStamp = null;

let kindlesWsTimeStamp = null;

let earlyEntryDivideActive = false;

let checkingOrderMissing = [];

let privateChannelUp = false;

let levelsTimeStamp = [];

const qtyPerPair = process.env.qtyPerPair

let ma20Restriction = process.env.ma20Restriction

let want2Win = new Big(process.env.want2Win)

let distance2Put = process.env.distance2Put

let longKindles = parseInt(process.env.longKindles)

let shortKindles = parseInt(process.env.shortKindles)

let values = [];

let volumes = [];

let kindleCount = 1;

let actions = [];

let maxProfit = new Big(0);

let minProfit = 0;

let maxPerdida = new Big(0);

let averages = [];

let minFromM20 = [];

let maxFromM20 = [];

let ma5 = [];

let ma5Values = [];

let ma5Sum = [];

let lastMa200 = [];

let lastMa20 = [];

let lastTrend = [];

let canOpen = []

let firstOp = [];

let dropDownPercent = new Big(0);

let realCash = new Big(0);

let alpha20 = new Big(2).div(shortKindles+1);

let alpha200 = new Big(2).div(longKindles+1);

let type = process.env.type

app.use(cors());

app.listen(process.env.puerto, () => {
    logger.info(" Arrancamos Bob en el puerto 8001");
});

app.get('/stop',(req,res) => {
    stop = true;
    let status = {
        stop : stop,
        stopOpening : stopOpening
    }
    fs.writeFile('./status.json', JSON.stringify(status), err => {
        if (err) {
            error = true;
        }
      });
    res.send("OK");
})

app.get('/stopOpening',(req,res) => {
    stopOpening = true;
    let status = {
        stop : stop,
        stopOpening : stopOpening
    }
    fs.writeFile('./status.json', JSON.stringify(status), err => {
        if (err) {
            error = true;
        }
      });
    res.send("OK");
})

app.get('/start',(req,res) => {
    stop = false;
    let status = {
        stop : stop,
        stopOpening : stopOpening
    }
    fs.writeFile('./status.json', JSON.stringify(status), err => {
        if (err) {
            error = true;
        }
      });
    res.send("OK");
})

app.get('/startOpening',(req,res) => {
    stopOpening = false;
    let status = {
        stop : stop,
        stopOpening : stopOpening
    }
    fs.writeFile('./status.json', JSON.stringify(status), err => {
        if (err) {
            error = true;
        }
      });
    res.send("OK");
})

app.get('/stopOperatingPair',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    operations_status[pairID].stopOperating=true;
    fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
        if (err) {
            error = true;
        }
      });
    res.send("OK")
})

app.get('/startOperatingPair',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    operations_status[pairID].stopOperating=false;
    fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
        if (err) {
            error = true;
        }
      });
    res.send("OK")
})

app.get('/setInvisible',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    operations_status[pairID].invisible=true;
    totalCumm = totalCumm.minus(operations_status[pairID].realCummulativeQty);
    if (investLimitReached && totalCumm.lt(limitInvestment)) investLimitReached = false;
    moneyNeededByRealOps = moneyNeededByRealOps.minus(operations_status[pairID].moneyNeeded);
    fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
        if (err) {
            error = true;
        }
      });
    res.send("OK")
})

app.get('/setVisible',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    totalCumm = totalCumm.plus(operations_status[pairID].realCummulativeQty);
    operations_status[pairID].invisible=false;
    if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
    fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
        if (err) {
            error = true;
        }
      });
    res.send("OK")
})

app.get('/stopDivideAndConquer',(req,res) => {
    divideAndConquerActive = false;
    res.send("OK")
})

app.get('/startDivideAndConquer',(req,res) => {
    divideAndConquerActive = true;
    res.send("OK")
})

app.get('/earlyEntryDivideActive',(req,res) => {
    earlyEntryDivideActive = true;
    res.send("OK")
})

app.get('/earlyEntryDivideDisable',(req,res) => {
    earlyEntryDivideActive = false;
    res.send("OK")
})

app.get('/getActiveOperations',(req,res) => {
    res.send(operations_status);
})

app.get('/getSimulationInfo',(req,res) => {
    let answer = {
        "long" : operations_status_long,
        "short" : operations_status_short
    }
    res.send(answer);
})

app.get('/getLimboInfo',(req,res) => {
    res.send(limbo);
})

app.get('/getFridgeOperations',(req,res) => {
    res.send(operations_status_pause);
})

app.get('/getRealProfit',(req,res) => {
    let total = closedProfit.plus(pnl).plus(fees);
    let real = totalProfitit.plus(pnl).plus(fees);
    let answer = {
        "Cerrado" : closedProfit.toFixed(2),
        "PNL" : pnl.toFixed(2),
        "Fees" : fees.toFixed(2),
        "Total" : total.toFixed(2),
        "Pares" : openOperations,
        "Real" : real.toFixed(2),
        "En Caja" : usdtAvaliable.toFixed(2),
        "Invertido" : totalCumm.toFixed(2),
        "Nevera" : moneyInFridger.toFixed(2),
        "Max Invertido" :  maxInversion.toFixed(2),
        "Max PNL" : maxPNL.toFixed(2),
        "Total Cerrado" : totalCerrado.toFixed(2),
        "Maxima perdida" : maxPerdida.toFixed(2),
        "Maxima perdida % " : dropDownPercent.toFixed(2),
        "Max Perdida Actual: " : (maxProfit.minus(minProfit)).toFixed(2),
        "Long Ops Ready" :  ready4RealLongOps,
        "Short Ops Ready" : ready4RealShortOps,
        "Parado manualmente" : stop,
        "Prohibido abrir nuevas ops" : stopOpening,
        "Dinero necesario para acercar las ops" : moneyNeededByRealOps.toFixed(2),
        "Limitando a 2 ops" : limitingops,
        "Dinero Limite inversion" : limitInvestment.toFixed(2),
        "Limite inversion alcanzado": investLimitReached,
        "Dinero en simulacion para pasar a real" : amountToStartRealOpLongEarly.toFixed(2),
        "Dinero límite en niveles 1" : realOpsStartAmountLimit.toFixed(2),
        "Dinero en niveles 1" : realOpsStartAmount.toFixed(2),
        "Divide y venceras en:" : divideAndConquerMaxCummValue.toFixed(2),
        "MinBet" : minInitialBet,
        "MaxBet" : maxInitialBet,
        "Partimos Early" : earlyEntryDivideActive 
    }
    res.send(answer);
})

app.get('/closeAllOperations', async (req,res) => {
    stop = true;
    if (!test) {
        for (let pairID=0;pairID<okex.pairs.length;pairID++) {
            if (operations_status[pairID].side!="none" || operations_status[pairID].state=="starting") {
                if (operations_status[pairID].side=="long") {
                    if (operations_status[pairID].state=="none") {
                        operations_status[pairID].state="closing";
                        let pairOrderId = Date.now();
                        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
                        .then(answer =>{
                            if (answer!="error" && answer.code!=null && answer.code=="0") {
                                anotherOrder(pairID,"sell","market", operations_status[pairID].executedQty, 0, "long");
                            } else {
                                res.send("Error al cancelar las ordenes abiertas. Intentalo de nuevo más tarde");  
                            }
                        })
                        
                    } else {
                        res.send("La operaciones está ahora mismo haciendo algo. Intentalo de nuevo más tarde");
                    }
                } else if (operations_status[pairID].side=="short") {
                    if (operations_status[pairID].state=="none") {
                        operations_status[pairID].state="closing";
                        let pairOrderId = Date.now();
                        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
                        .then(answer =>{
                            if (answer!="error" && answer.code!=null && answer.code=="0") {
                                anotherOrder(pairID,"buy","market", operations_status[pairID].executedQty, 0, "short");
                            } else {
                                res.send("Error al cancelar las ordenes abiertas. Intentalo de nuevo más tarde");  
                            }
                        })
                        
                    } else {
                        res.send("La operaciones está ahora mismo haciendo algo. Intentalo de nuevo más tarde");
                    }
                } else {
                    res.send("No hemos encontrado ninguna operación abierta del par " + pair);
                }
            }
            await sleep(500);
        }
        
    }
    res.send("Se está realizando el cierre de todas las operaciones");
})

app.get('/newCloseWin',(req,res) => {
    closeWin = new Big(req.query.closeWin);
    res.send("Nuevo closeWin: " + closeWin);
})

app.get('/closeOperation',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    if (operations_status[pairID].side=="long") {
        if (operations_status[pairID].state=="none") {
            operations_status[pairID].state="closing";
            okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
            .then(answer =>{
                if (answer!="error" && answer.code!=null && answer.code=="0") {
                    anotherOrder(pairID,"sell","market", operations_status[pairID].executedQty, 0, "long");
                    res.send("OK")
                } else {
                    res.send("Error al cancelar las ordenes abiertas. Intentalo de nuevo más tarde");  
                }
            })
            
        } else {
            res.send("La operaciones está ahora mismo haciendo algo. Intentalo de nuevo más tarde");
        }
        
    } else if (operations_status[pairID].side=="short") {
        if (operations_status[pairID].state=="none") {
            operations_status[pairID].state="closing";
            okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
            .then(answer =>{
                if (answer!="error" && answer.code!=null && answer.code=="0") {
                    anotherOrder(pairID,"buy","market", operations_status[pairID].executedQty, 0, "short");
                    res.send("OK")
                } else {
                    res.send("Error al cancelar las ordenes abiertas. Intentalo de nuevo más tarde");  
                }
            })
            
        } else {
            res.send("La operaciones está ahora mismo haciendo algo. Intentalo de nuevo más tarde");
        }
    } else {
        res.send("No hemos encontrado ninguna operación abierta del par " + pair);
    }
})

app.get('/levelOperation',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    levelPosition(pairID, true);
    res.send("OK")
})

app.get('/levelOperationWithQty',(req,res) => {
    let pair = req.query.pair;
    let cummulativeQty = new Big(req.query.qty);
    let pairID = okex.pairs.indexOf(pair);
    levelPositionWithQty(pairID,cummulativeQty);
    res.send("OK")
})

app.get('/levelOperationToDistance',(req,res) => {
    let pair = req.query.pair;
    let distance = parseFloat(req.query.distance);
    let pairID = okex.pairs.indexOf(pair);
    levelPositionToDistance(pairID,distance);
    res.send("OK")
})

app.get('/startOperation',(req,res) => {
    let pair = req.query.pair;
    let side = req.query.side
    startPositionManually(pair,side);
    res.send("OK")
})

app.get('/startOperationWithQty',(req,res) => {
    let pair = req.query.pair;
    let side = req.query.side
    let cumm = req.query.qty;
    startPositionManually(pair,side, cumm);
    res.send("OK")
})

app.get('/modifyCloseOrder',(req,res) =>{
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair)
    let margin = new Big(req.query.margin);
    
    if (operations_status[pairID].state=="none" && operations_status[pairID].side=="long") {
        margin = new Big(1).plus(margin)
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(cancelAnswer => {
            if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                let closePrice = operations_status[pairID].executedPrice.times(margin);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId = answer;
                                }
                            })
                    })
                operations_status[pairID].state="none";
            } else {
                operations_status[pairID].state="none"
            }
        })

    } else if (operations_status[pairID].side=="short") {
        margin = new Big(1).minus(margin)
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(cancelAnswer => {
            if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                let closePrice = operations_status[pairID].executedPrice.times(margin);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId = answer;
                                }
                            }) 
                    })
                operations_status[pairID].state="none";
                    
            } else {
                operations_status[pairID].state="none"
            }
        })    
    }
    res.send("OK");
})

app.get('/setTakeProfit',(req,res) =>{
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair)
    let price = new Big(req.query.price);
    if ((operations_status[pairID].side=="long" && price.lte(operations_status[pairID].closeValue)) || (operations_status[pairID].side=="short" && price.gte(operations_status[pairID].closeValue))) {
        res.send("No se puede hacer lo que pides")
    } else{
        operations_status[pairID].takeProfit = true;
        if (operations_status[pairID].state=="none" && operations_status[pairID].side=="long") {
            //margin = new Big(1).plus(margin)
            okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
            .then(cancelAnswer => {
                if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                    let closePrice = price;
                    checkPrice(closePrice,pairID)
                        .then(closePrice => {
                            okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                                .then(answer => {
                                    if (answer=="error"){
                                        operations_status[pairID].state="noClosingOrder";
                                    } else {
                                        operations_status[pairID].state="none";
                                        operations_status[pairID].orderId = answer;
                                    }
                                })
                        })
                    operations_status[pairID].state="none";
                } else {
                    operations_status[pairID].state="none"
                }
            })

        } else if (operations_status[pairID].side=="short") {
            //margin = new Big(1).minus(margin)
            okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
            .then(cancelAnswer => {
                if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                    let closePrice = price;
                    checkPrice(closePrice,pairID)
                        .then(closePrice => {
                            okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                                .then(answer => {
                                    if (answer=="error"){
                                        operations_status[pairID].state="noClosingOrder";
                                    } else {
                                        operations_status[pairID].state="none";
                                        operations_status[pairID].orderId = answer;
                                    }
                                }) 
                        })
                    operations_status[pairID].state="none";
                        
                } else {
                    operations_status[pairID].state="none"
                }
            })    
        }
    }
    res.send("OK");
})

app.get('/removeTakeProfit',(req,res) =>{
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair)
 
    if (operations_status[pairID].state=="none" && operations_status[pairID].side=="long") {
        //margin = new Big(1).plus(margin)
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(cancelAnswer => {
            if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                let closePrice = operations_status[pairID].executedPrice.times(1.01);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId = answer;
                                }
                            })
                    })
                operations_status[pairID].state="none";
            } else {
                operations_status[pairID].state="none"
            }
        })

    } else if (operations_status[pairID].side=="short") {
        //margin = new Big(1).minus(margin)
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(cancelAnswer => {
            if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                let closePrice = operations_status[pairID].executedPrice.times(0.99);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId = answer;
                                }
                            }) 
                    })
                operations_status[pairID].state="none";
                    
            } else {
                operations_status[pairID].state="none"
            }
        })    
    }
    operations_status[pairID].takeProfit = false;

    res.send("OK");
})

app.get('/forceNextActionAt',(req,res) =>{
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair)
    let price = new Big(req.query.price);
    if (price.gte(operations_status[pairID].closeValue)){
        res.send("EL precio indicado es superior al precio actual del par")
    }
    else if (operations_status[pairID].side!="short") {
        operations_status[pairID].forceNextLevelAt = price;
    } else {
        res.send("Deja de joder y mira bien lo que haces")
    }
    res.send("OK");
})

app.get('/forceOpenAt',(req,res) =>{
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair)
    let price = new Big(req.query.price);
    let qty = new Big(req.query.qty);
    if (price.gte(operations_status[pairID].closeValue)){
        res.send("EL precio indicado es superior al precio actual del par")
    }
    else if (operations_status[pairID].side=="null") {
        operations_status[pairID].forceOpenAt = price;
        if (qty!=0) operations_status[pairID].forceOpenAtQty = qty;
        else operations_status[pairID].forceOpenAtQty = null;
    } else {
        res.send("Deja de joder y mira bien lo que haces")
    }
    res.send("OK");
})

app.get('/modifyNumberPairsReady',(req,res) =>{
    numberPairsReady = req.query.number;
    res.send("OK");
})

app.get('/transferToSpot',(req,res) =>{
    let amount = req.query.amount;
    okex.transferFuturesToSpot("USDT",amount)
    res.send("OK");
})

app.get('/transferToFutures',(req,res) =>{
    let amount = req.query.amount;
    okex.transferSpotToFutures("USDT",amount)
    res.send("OK");
})

app.get('/saveInfo',(req,res) =>{
    let error = false;
    // fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
    //     if (err) {
    //         error = true;
    //     }
    //   });
    // fs.writeFile('./fridge.json', JSON.stringify(operations_status_pause), err => {
    //     if (err) {
    //         error = true;
    //     }
    //   });
    // if (!error) {
    //     res.send("OK");
    // } else {
    //     res.send("KO");
    // }
    for (let i=0;i<okex.pairs.length;i++) {
        if (okex.pairs[i].includes("USDT") && actions[i].length>0){
            let json = {
                "actions" : actions[i]
            }
            let imeStamp = Date.now();
           

              fs.writeFile('./actions/'+okex.pairs[i]+'.json', JSON.stringify(json), err => {
                if (err) {
                    error = true;
                }
              });
            
        }  
    }
    res.send("OK");
    
})

app.get('/divideAndConquer',(req,res) =>{
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    let amount = new Big(req.query.amount);
    if (operations_status[pairID].side!="none") divideAndConquerManually(pairID,amount, false);
    res.send("OK")
})

app.get('/divideAndConquerEntryPercent',(req,res) =>{
    divideAndConquerEntryPercent = new Big(req.query.percent);
    res.send("Nuevo porcentaje para el divicde&Conquer: " + divideAndConquerEntryPercent)
})

app.get('/changeOpToOtherPair',(req,res) =>{
    let initialPair = req.query.initPair;
    let finalPair = req.query.finalPair;
    logger.info("Vamos a mover operacion del par " + initialPair + " al par " + finalPair);
    let pairID = okex.pairs.indexOf(initialPair);
    let finalPairID = okex.pairs.indexOf(finalPair);
    logger.info("Ids de los pares " + pairID + " al par " + finalPairID);
    let changeSide = req.query.chageSide;
    let isOK=false
    if (operations_status[pairID].side!="none" && operations_status[finalPairID].side=="none" && operations_status[finalPairID].state=="none") isOK = true;
    if (changeSide==1 && pairID==finalPairID && operations_status_pause[pairID]==null) isOK = true;
    if (privateChannelUp && isOK){
        operations_status[pairID].takeProfit=false;
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(answer =>{
            if (answer!="error" && answer.code!=null && answer.code=="0") {
                res.send("Empezamos el proceso")
                changeOpToOtherPair(pairID,finalPairID,changeSide);
            } else {
                res.send("Error al cancelar las ordenes abiertas. Intentalo de nuevo más tarde");  
            }
        }) 
    } else res.send("No hemos encontrado la operación o el par destino esta ocupado o canal privado caido");
})

app.get('/changeOpToLimbo',(req,res) =>{
    let initialPair = req.query.initPair;
    
    logger.info("Vamos a mover operacion del par " + initialPair + " al limbo ");
    let pairID = okex.pairs.indexOf(initialPair);
    logger.info("Ids de los pares " + pairID );

    if (privateChannelUp && operations_status[pairID].side!="none"){
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(answer =>{
            if (answer!="error" && answer.code!=null && answer.code=="0") {
                res.send("Empezamos el proceso")
                changeOpToLimbo(pairID);
            } else {
                res.send("Error al cancelar las ordenes abiertas. Intentalo de nuevo más tarde");  
            }
        }) 
    } else res.send("No hemos encontrado la operación o canal privado caido");
})

app.get('/getOpfromLimbo',(req,res) =>{
    let id = req.query.id;
    let finalPair = req.query.finalPair;
    let movingPairId = okex.pairs.indexOf(finalPair);
    let toSide = req.query.side;
    let pos = null;
    logger.info("Arrancamos operacion del limbo en el par " + finalPair +" en sentido " + toSide)
    if (!privateChannelUp || operations_status[movingPairId].side!="none" || operations_status[movingPairId].state!="none") {
        res.send("Par ocupado o canal privado caido")
    } else {
        let encontrado = false;
        for (let i=0;i<limbo.length;i++){
            if (limbo[i].id==id) {
                encontrado=true;
                pos = i;
                let looseAux = limbo[i].loose
                if (limbo[i].originalSide!=toSide) looseAux = new Big(1).div(looseAux);
                operations_status[movingPairId].movingLoose= looseAux;
                if (limbo[i].timesMoving!=null) operations_status[movingPairId].timesMoving = limbo[i].timesMoving
                else operations_status[movingPairId].timesMoving = 1;
                if (toSide=="long") startPositionMoving(movingPairId,"long",limbo[i].cummClose);
                else if (toSide=="short") startPositionMoving(movingPairId,"short",limbo[i].cummClose);
                else {
                    encontrado = false;
                    res.send("no tiene sentido");
                }
            }
        }
        if (encontrado) {
            limbo.splice(pos,1);
            fs.writeFile('./limbo.json', JSON.stringify(limbo), err => {
                if (err) {
                    error = true;
                }
            });
            res.send("OK")
        }
        else res.send("no hemos encontrado operacion con ese id");
    }             
})

app.get('/getOpfromLimboWithQty',(req,res) =>{
    let id = req.query.id;
    let finalPair = req.query.finalPair;
    let movingPairId = okex.pairs.indexOf(finalPair);
    let toSide = req.query.side;
    let cumm = new Big(req.query.qty)
    let pos = null;
    logger.info("Arrancamos operacion del limbo en el par " + finalPair +" en sentido " + toSide)
    if (!privateChannelUp || operations_status[movingPairId].side!="none" || operations_status[movingPairId].state!="none") {
        res.send("Par ocupado o canal privado caido")
    } else {
        let encontrado = false;
        for (let i=0;i<limbo.length;i++){
            if (limbo[i].id==id) {
                encontrado=true;
                pos = i;
                let looseAux = limbo[i].loose
                if (limbo[i].originalSide!=toSide) looseAux = new Big(1).div(looseAux);
                operations_status[movingPairId].movingLoose= looseAux;
                if (limbo[i].timesMoving!=null) operations_status[movingPairId].timesMoving = limbo[i].timesMoving
                else operations_status[movingPairId].timesMoving = 1;
                if (toSide=="long") {
                    startPositionMoving(movingPairId,"long",cumm);
                    limbo[i].cummClose = new Big(limbo[i].cummClose).minus(cumm)
                }
                else if (toSide=="short") {
                    startPositionMoving(movingPairId,"short",cumm);
                    limbo[i].cummClose = new Big(limbo[i].cummClose).minus(cumm)
                }
                else {
                    encontrado = false;
                    res.send("no tiene sentido");
                }
            }
        }
        if (encontrado) {
            fs.writeFile('./limbo.json', JSON.stringify(limbo), err => {
                if (err) {
                    error = true;
                }
            });
            res.send("OK")
        }
        else res.send("no hemos encontrado operacion con ese id");
    }             
})

app.get('/getOpfromOtherLimbo',(req,res) =>{
    let finalPair = req.query.finalPair;
    let movingPairId = okex.pairs.indexOf(finalPair);
    let toSide = req.query.side;
    let fromSide = req.query.fromSide;
    let loose = req.query.loose;
    let cummClose = req.query.cummClose;
    logger.info("Arrancamos operacion de otro limbo en el par " + finalPair)
    if (!privateChannelUp || operations_status[movingPairId].side!="none" || operations_status[movingPairId].state!="none") {
        res.send("Par ocupado o canal privado caido")
    } else {
        let looseAux = loose
        if (fromSide!=toSide) looseAux = new Big(1).div(looseAux);
        operations_status[movingPairId].movingLoose= looseAux;
        if (toSide=="long") startPositionMoving(movingPairId,"long",cummClose);
        if (toSide=="short") startPositionMoving(movingPairId,"short",cummClose);
        res.send("OK")
        
    }             
})

app.get('/removeOpfromLimbo',(req,res) =>{
    let id = req.query.id;
    logger.info("Borramos del limbo la operacion con ID " + id)
    let encontrado = false;
    for (let i=0;i<limbo.length;i++){
        if (limbo[i].id=id) {
            encontrado=true;
            limbo.splice(i,1);
            fs.writeFile('./limbo.json', JSON.stringify(limbo), err => {
                if (err) {
                    error = true;
                }
            });
        }
    }
    
    if (encontrado) res.send("OK")
    else res.send("no hemos encontrado operacion con ese id");
                
})

app.get('/moveToFridge',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    let amount = new Big(req.query.amount);
    logger.info("Movemos a la nevera "+ amount +" dolares del par " + pair)
    if (operations_status[pairID].side!="none") moveToFrigde(pairID,amount);
    res.send("OK")
})

app.get('/removeFromFridge',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    logger.info("Sacamos de la nevera el par " + pair)
    if (operations_status[pairID].side!="none") removeFromFrigde(pairID);
    res.send("OK")
})

app.get('/setStopLoss',(req,res) => {
    let pair = req.query.pair;
    let price = new Big(req.query.price);
    let pairID = okex.pairs.indexOf(pair);
    logger.info("Marcado StopLoss para el par " + pair + " en " + price);
    if ((operations_status[pairID].side=="long" && price.gte(operations_status[pairID].closeValue)) || (operations_status[pairID].side=="short" && price.lte(operations_status[pairID].closeValue))) {
        res.send("No se puede hacer lo que pides")
    } else {
        operations_status[pairID].stopLoss = price;
        res.send("OK")
    }
    fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
        if (err) {
            error = true;
        }
    });
    
})

app.get('/removeStopLoss',(req,res) => {
    let pair = req.query.pair;
    let pairID = okex.pairs.indexOf(pair);
    logger.info("Eliminamos StopLoss para el par " + pair);
    operations_status[pairID].stopLoss = null;
    res.send("OK")
    fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
        if (err) {
            error = true;
        }
    });
    
})

const clientokex = new webSocketClient();

const clientokexKindles = new webSocketClient();

clientokex.on('connectFailed', async function(error) {
    try {
        logger.error(' ConnectFailed Error okex client: ' + error.toString());
        //await sleep(30000);
        process.exit(0);
    } catch (error) {
        logger.error("QUe coño pasa: " + error)
    }
});

clientokexKindles.on('connectFailed', async function(error) {
    try {
        logger.error(' ConnectFailed Error okex Kindles: ' + error.toString());
        await sleep(30000);
        connectKindleStream();
    } catch (error) {
        logger.error("QUe coño pasa: " + error)
    }
});
 
clientokex.on('connect', function(connection) { 
    logger.info(' Conectados a okex')
    loginUserDataStream(connection);
    setInterval( async ()=>{
        connection.ping("ping")
    },21000)
    connection.on('error', function(error) {
        logger.error(' Connect Error okex: ' + error.toString());
    });
    connection.on('close', async function(message) {
        logger.info(' okex Closed Client' + message);
        privateChannelUp = false;
        await sleep(30000);
        connectUserDataStream();
    });
    connection.on('message', function(message) {
        
        if (message.type === 'utf8') {
            clientWsTimeStamp = Date.now();
            try {
                let parseData = JSON.parse(message.utf8Data);   
                if (parseData.event=="login" && parseData.code=="0") {
                    subcribeUserDataStream(connection);
                } else if (parseData.event=="subscribe") {
                    logger.info("subscritos al canal privadode Okex")
                }
                else if (parseData.arg.instType=="SWAP") {
                    for (let i = 0; i<parseData.data.length; i++){
                        
                        let info = parseData.data[i];
                        //logger.info(i + " " + JSON.stringify(info,null,2))
                        if (info.state!="live"){
                            // logger.info("********************************************************************")
                            // logger.info("********************************************************************")
                            // logger.info("*****************WEBSOCKET******************************************")
                            // logger.info("********************************************************************")
                            // logger.info("********************************************************************")
                            // logger.info(JSON.stringify(info,null,2));
                            // logger.info("********************************************************************")
                            // logger.info("********************************************************************")
                            let trade = {
                                "ap": info.avgPx,
                                "q": info.sz,
                                "L": info.fillPx,
                                "l": info.fillSz,
                                "n": info.fillFee,
                                "rp": info.pnl,
                                "S": info.side.toUpperCase(),
                            }
                            let pairID = okex.instId.indexOf(info.instId);
                            if (info.category!="normal") {
                                if (info.category=="full_liquidation") {
                                    manageClosingOrder(pairID, trade)
                                } else if (info.category=="partial_liquidation") {
                                    manageClosingPartialOrder(pairID,trade)
                                }
                                
                            } else if (info.category=="normal" && info.state=="filled") {
                                
                                if (info.ordType=="limit" || operations_status[pairID].state == "closing") {
                                    if (operations_status[pairID].takeProfit) {
                                        operations_status[pairID].movingToPair = "limbo";
                                        operations_status[pairID].moving = true;   
                                    }
                                    if (operations_status[pairID].moreOrders) manageNextClosingOrder(pairID, trade)
                                    else manageClosingOrder(pairID, trade)
                                } else if (operations_status[pairID].state == "moving") {
                                    if (operations_status[pairID].moreOrders) manageNextInitialOrder(pairID,trade);
                                    else manageInitialOrderMoving(pairID, trade)
                                } else if (operations_status[pairID].state == "starting"){
                                    if (operations_status[pairID].moreOrders) manageNextInitialOrder(pairID,trade);
                                    else manageInitialOrder(pairID, trade)
                                } else if (operations_status[pairID].state == "leveling") {
                                    if (operations_status[pairID].moreOrders) manageNextLevelingOrder(pairID, trade)
                                    else manageLevelingOrder(pairID, trade)
                                } else if (operations_status[pairID].state=="sellingSurplus") {
                                    manageSurplusOrder(pairID, trade);
                                } else {
                                    manageUnknownOrder(pairID,trade)
                                }
                            } else if (info.category=="normal" && info.state=="partially_filled"){
                                if (info.ordType=="limit" || operations_status[pairID].state == "closing") {
                                    manageClosingPartialOrder(pairID,trade)
                                } else if (operations_status[pairID].state == "starting" || operations_status[pairID].state == "leveling") {
                                    manageOtherPartialOrder(pairID,trade)
                                } else {
                                    manageUnknownPartialOrder(pairID,trade)
                                }
                            }  
                        }
                        
                    }
                }
                      
            } catch(error){
                logger.error(' Connect Error okex: ' + error.toString())
            }
        }
    }); 
});

clientokexKindles.on('connect', function(connection) { 
    logger.info(' Conectados a okex Kindles')
    subscribeKindleStream(connection);
    setInterval( async ()=>{
        connection.ping("ping")
    },21000)
    connection.on('error', function(error) {
        logger.error(' Connect Error okex: Kindles ' + error.toString());
    });
    connection.on('close', async function(message) {
        logger.info(' okex Closed Kindles' + message);
        await sleep(30000);
        connectKindleStream();
        
    });
    connection.on('message', async function(message) {
        if (message.type === 'utf8') {
            kindlesWsTimeStamp = Date.now();
            // try {
                let parseData = JSON.parse(message.utf8Data); 
                if (parseData.event!=null && parseData.event=="subscribe") {
                    //no hago nada
                }
                else if (parseData.arg!=null /*&& parseData.arg.instId.includes("BTC")*/) {
                    let pairAux = parseData.arg.instId
                    let pairID = okex.instId.indexOf(pairAux); 
                    if (operations_status[pairID]!=null && operations_status[pairID]!="ready"){
                        let date = parseData.data[0][0];
                        date = date*1
                        let dateFormat = new Date(date)
                        // console.log(kindleCount+" Date: "+ dateFormat.getDate()+
                        //     "/"+(dateFormat.getMonth()+1)+
                        //     "/"+dateFormat.getFullYear()+
                        //     " "+dateFormat.getHours()+
                        //     ":"+dateFormat.getMinutes()+
                        //     ":"+dateFormat.getSeconds());
                        // kindleCount++;


                         let closeValue = 0; 
                                let openValue = 0;
                             
                                let highValue = 0;
                                let lowValue = 0;


                        try {
                                closeValue = new Big(parseData.data[0][4]); 
                                openValue = new Big (parseData.data[0][1]);
                                kindleCounter[pairID]++;
                                highValue = new Big(parseData.data[0][2]);
                                lowValue = new Big(parseData.data[0][3]);
                        } catch (error) {
                            logger.info("Este es el data que falla PABLO: " + parseData);
                             logger.error("Error: " + error);
                        }

                        operations_status[pairID].closeValue = closeValue; 
                        if (operations_status[pairID].side=="long") operations_status[pairID].closeValue = lowValue
                        if (operations_status[pairID].side=="short") operations_status[pairID].closeValue = highValue
                        // Cerramos operacion
                        if (operations_status[pairID].side=="long" && (operations_status[pairID].ma200Ternd=="down")) {
                            closePosition(pairID , openValue, date);
                        }
                        if (operations_status[pairID].side=="short" && (operations_status[pairID].ma200Ternd=="up")) {
                            closePosition(pairID , openValue, date);
                        }
                      

                        // CALCULAMOS PNL 
                        if (operations_status[pairID].side=="long"){
                            
                            //NUEVO PARA SIMU
                            closeValue = lowValue;
                            let totQty = new Big(operations_status[pairID].executedQty);
                            let totCumm = new Big(operations_status[pairID].cummulativeQty);
                            if (operations_status[pairID].isMoreOnFridger) {
                                totQty = totQty.plus(operations_status_pause[pairID].executedQty);
                                totCumm = totCumm.plus(operations_status_pause[pairID].cummulativeQty)
                            }
                            let sell = closeValue.times(totQty);
                            let comission = sell.times(0.0004);
                            if (test) comission = sell.times(0.0008);
                            let pnlAux =sell.minus(totCumm.plus(comission));
                            let diff = pnlAux.minus(operations_status[pairID].pnl);
                            operations_status[pairID].pnl = pnlAux;
                            pnl = pnl.plus(diff); 
                            if (pnl.lt(maxPNL)) {
                                maxPNL=pnl;
                            }
                            if (pnlAux.lt(-15)) {
                                // logger.info("PNL disparado: " + pnlAux + " en el par " + okex.pairs[pairID] + " side long execPrice: " + operations_status[pairID].executedPrice + " ActualPrice: " + closeValue);
                            }
                            if (pnlAux.lt(operations_status[pairID].maxPNL)) {
                                operations_status[pairID].maxPNL=pnlAux  
                            }
                            let distance = new Big(1).minus(closeValue.div(operations_status[pairID].executedPrice));
                            operations_status[pairID].distance = distance;
                            if (!operations_status[pairID].invisible) {
                                let need = new Big(0);
                                let qtyMultiplier = distance.div(percent4OneBox);
                                let cummulativeQty = totCumm.times(qtyMultiplier);
                                need = need.plus(cummulativeQty).plus(totCumm);
                                moneyNeededByRealOps = moneyNeededByRealOps.minus(operations_status[pairID].moneyNeeded);
                                moneyNeededByRealOps = moneyNeededByRealOps.plus(need);
                                operations_status[pairID].moneyNeeded = need;
                            }
                            if (!limitingops && moneyNeededByRealOps.gte(amountToStopOperatingAllPairs)) {
                                limitingops = true;
                                lastMoneyNeeded = moneyNeededByRealOps;
                                logger.info("Limitamos las operaciones de pares")
                                logger.info("************************************************")
                                selectPairsToOperate();
    
                            } 
                            if (limitingops && moneyNeededByRealOps.lt(amountToStopOperatingAllPairs)) {
                                limitingops = false;
                                lastMoneyNeeded = new Big(0);
                                firstPairWhenLimiting = null;
                                logger.info("Finalizada la limitacion de operaciones de pares")
                                logger.info("************************************************")
                                for (let x=0;x<okex.pairs.length;x++) {
                                    operations_status[x].limitOperations = false;
                                }
                            }
                        
                            
                        } else if (operations_status[pairID].side=="short") {
                            //NUEVO PARA SIMU
                            closeValue = highValue;
                            let totQty = new Big(operations_status[pairID].executedQty);
                            let totCumm = new Big(operations_status[pairID].cummulativeQty);
                            if (operations_status[pairID].isMoreOnFridger) {
                                totQty = totQty.plus(operations_status_pause[pairID].executedQty);
                                totCumm = totCumm.plus(operations_status_pause[pairID].cummulativeQty)
                            }
                            let buy = closeValue.times(totQty);
                            let comission = buy.times(0.0004);
                            if (test) comission = totCumm.times(0.0008);
                            let pnlAux = totCumm.minus(buy.plus(comission));
                            let diff = pnlAux.minus(operations_status[pairID].pnl);
                            operations_status[pairID].pnl = pnlAux;
                            pnl = pnl.plus(diff);
                            if (pnl.lt(maxPNL)) {
                                maxPNL=pnl;
                            }
                            if (pnlAux.lt(-15)) {
                                // logger.info("PNL disparado: " + pnlAux + " en el par " + okex.pairs[pairID] + " side short execPrice: " + operations_status[pairID].executedPrice + " ActualPrice: " + closeValue);
                            }
                            let distance = new Big(1).minus(operations_status[pairID].executedPrice.div(closeValue));
                            operations_status[pairID].distance = distance;
                            if (!operations_status[pairID].invisible) {
                                let need = new Big(0);
                                let qtyMultiplier = distance.div(percent4OneBox);
                                let cummulativeQty = totCumm.times(qtyMultiplier);
                                need = need.plus(cummulativeQty).plus(totCumm);
                                moneyNeededByRealOps = moneyNeededByRealOps.minus(operations_status[pairID].moneyNeeded);
                                moneyNeededByRealOps = moneyNeededByRealOps.plus(need);
                                operations_status[pairID].moneyNeeded = need;
                            }
                            if (!limitingops && moneyNeededByRealOps.gte(amountToStopOperatingAllPairs)) {
                                limitingops = true;
                                lastMoneyNeeded = moneyNeededByRealOps;
                                logger.info("Limitamos las operaciones de pares")
                                logger.info("************************************************")
                                selectPairsToOperate();
                                
                            }  
                            if (limitingops && moneyNeededByRealOps.lt(amountToStopOperatingAllPairs)) {
                                limitingops = false;
                                lastMoneyNeeded = new Big(0);
                                firstPairWhenLimiting = null;
                                logger.info("Finalizada la limitacion de operaciones de pares")
                                logger.info("************************************************")
                                for (let x=0;x<okex.pairs.length;x++) {
                                    operations_status[x].limitOperations = false;
                                }
                            }
                        }

                        // if (pnl.gt(totalCumm.times(0.1))) {
                        //     logger.info("Cerramos todo");
                        //     for (let z=0;z<okex.pairs.length;z++) {
                        //         if(operations_status[z].side!="none") closePosition(z,operations_status[z].closeValue,date);
                        //     }
                        // }
                        

                        
                        //CAMBIO PARA SIMU
                        closeValue = new Big(parseData.data[0][4]);  
    
                        //CALCULAMOS LONG O SHORT
                        let shortCloseCheck = false;
                        let longCloseCheck = false;
                        let justOpenLong = false;
                        let justOpenShort = false;
                        if (operations_status[pairID].ma20!=null && operations_status[pairID].ma200!=null /*&& date>=1675161900000*/) {
                            if (minFromM20[pairID]==null) minFromM20[pairID]= operations_status[pairID].ma20;
                            if (maxFromM20[pairID]==null) maxFromM20[pairID]= operations_status[pairID].ma20;
                            if (operations_status[pairID].averageVolume.lt(40000) && operations_status[pairID].side=="none") {
                                operations_status[pairID].sideInfo="none"
                            } else {
                                // PARA SIMU
                                
                                operations_status[pairID].sideInfo="noImporta"
                                let distance = new Big(0)
                                if (operations_status[pairID].ma20.gt(operations_status[pairID].ma200)) distance = operations_status[pairID].ma20.div(operations_status[pairID].ma200) 
                                if (operations_status[pairID].ma20.lt(operations_status[pairID].ma200)) distance = operations_status[pairID].ma200.div(operations_status[pairID].ma20) 
                
                                if (/*distance.lt(1.05) &&*/ firstOp[pairID] && openValue.lt(operations_status[pairID].ma20) && highValue.gt(operations_status[pairID].ma20)  && operations_status[pairID].side=="none"  && operations_status[pairID].lastCross!=null && operations_status[pairID].ma200Ternd=="up" && operations_status[pairID].ma20.gt(operations_status[pairID].ma200) && operations_status[pairID].ma20.gt(lastMa20[pairID])) {
                                    startPosition(pairID,"long", date);
                                    firstOp[pairID]=false;
                                }
                                if (/*distance.lt(1.05) &&*/ firstOp[pairID] &&  openValue.gt(operations_status[pairID].ma20) && lowValue.lt(operations_status[pairID].ma20) && operations_status[pairID].side=="none"  && operations_status[pairID].lastCross!=null && operations_status[pairID].ma200Ternd=="down" && operations_status[pairID].ma20.lt(operations_status[pairID].ma200) && operations_status[pairID].ma20.lt(lastMa20[pairID])) {
                                    startPosition(pairID,"short", date);
                                    firstOp[pairID]=false;
                                }
                                
                           
                            }
                        }

                    /*    if (operations_status[pairID].ma20!=null && operations_status[pairID].ma200!=null && date<1675161900000) {
                            if (minFromM20[pairID]==null) minFromM20[pairID]= operations_status[pairID].ma20;
                            if (maxFromM20[pairID]==null) maxFromM20[pairID]= operations_status[pairID].ma20;
                            if (operations_status[pairID].averageVolume.lt(40000) && operations_status[pairID].side=="none") {
                                operations_status[pairID].sideInfo="none"
                            } else {
                                // PARA SIMU
                                
                                operations_status[pairID].sideInfo="noImporta"
                                let distance = new Big(0)
                                if (operations_status[pairID].ma20.gt(operations_status[pairID].ma200)) distance = operations_status[pairID].ma20.div(operations_status[pairID].ma200) 
                                if (operations_status[pairID].ma20.lt(operations_status[pairID].ma200)) distance = operations_status[pairID].ma200.div(operations_status[pairID].ma20) 
                
                                if ( firstOp[pairID] && openValue.lt(operations_status[pairID].ma20) && highValue.gt(operations_status[pairID].ma20)  && operations_status[pairID].side=="none"  && operations_status[pairID].lastCross!=null && operations_status[pairID].ma200Ternd=="up" && operations_status[pairID].ma20.gt(operations_status[pairID].ma200) && operations_status[pairID].ma20.gt(lastMa20[pairID])) {
                                    
                                    firstOp[pairID]=false;
                                }
                                if (firstOp[pairID] &&  openValue.gt(operations_status[pairID].ma20) && lowValue.lt(operations_status[pairID].ma20) && operations_status[pairID].side=="none"  && operations_status[pairID].lastCross!=null && operations_status[pairID].ma200Ternd=="down" && operations_status[pairID].ma20.lt(operations_status[pairID].ma200) && operations_status[pairID].ma20.lt(lastMa20[pairID])) {
                                    
                                    firstOp[pairID]=false;
                                }
                                
                           
                            }
                        }
*/
                        // CALCULAMOS PNL REPETIDO PARA SIMULACION
                        if (operations_status[pairID].side=="long"){
                        
                            //NUEVO PARA SIMU
                            closeValue = lowValue;
                            let totQty = new Big(operations_status[pairID].executedQty);
                            let totCumm = new Big(operations_status[pairID].cummulativeQty);
                            if (operations_status[pairID].isMoreOnFridger) {
                                totQty = totQty.plus(operations_status_pause[pairID].executedQty);
                                totCumm = totCumm.plus(operations_status_pause[pairID].cummulativeQty)
                            }
                            let sell = closeValue.times(totQty);
                            let comission = sell.times(0.0004);
                            if (test) comission = sell.times(0.0008);
                            let pnlAux =sell.minus(totCumm.plus(comission));
                            let diff = pnlAux.minus(operations_status[pairID].pnl);
                            operations_status[pairID].pnl = pnlAux;
                            pnl = pnl.plus(diff); 
                            if (pnl.lt(maxPNL)) {
                                maxPNL=pnl;
                            }
                            if (pnlAux.lt(-15)) {
                                // logger.info("PNL disparado: " + pnlAux + " en el par " + okex.pairs[pairID] + " side long execPrice: " + operations_status[pairID].executedPrice + " ActualPrice: " + closeValue);
                            }
                            if (pnlAux.lt(operations_status[pairID].maxPNL)) {
                                operations_status[pairID].maxPNL=pnlAux  
                            }
                            
                            let distance = new Big(1).minus(closeValue.div(operations_status[pairID].executedPrice));
                            operations_status[pairID].distance = distance;
                            if (!operations_status[pairID].invisible) {
                                let need = new Big(0);
                                let qtyMultiplier = distance.div(percent4OneBox);
                                let cummulativeQty = totCumm.times(qtyMultiplier);
                                need = need.plus(cummulativeQty).plus(totCumm);
                                moneyNeededByRealOps = moneyNeededByRealOps.minus(operations_status[pairID].moneyNeeded);
                                moneyNeededByRealOps = moneyNeededByRealOps.plus(need);
                                operations_status[pairID].moneyNeeded = need;
                            }
                            if (!limitingops && moneyNeededByRealOps.gte(amountToStopOperatingAllPairs)) {
                                limitingops = true;
                                lastMoneyNeeded = moneyNeededByRealOps;
                                logger.info("Limitamos las operaciones de pares")
                                logger.info("************************************************")
                                selectPairsToOperate();
    
                            } 
                            if (limitingops && moneyNeededByRealOps.lt(amountToStopOperatingAllPairs)) {
                                limitingops = false;
                                lastMoneyNeeded = new Big(0);
                                firstPairWhenLimiting = null;
                                logger.info("Finalizada la limitacion de operaciones de pares")
                                logger.info("************************************************")
                                for (let x=0;x<okex.pairs.length;x++) {
                                    operations_status[x].limitOperations = false;
                                }
                            }
                        
                            
                        } else if (operations_status[pairID].side=="short") {
                            //NUEVO PARA SIMU
                            closeValue = highValue;
                            let totQty = new Big(operations_status[pairID].executedQty);
                            let totCumm = new Big(operations_status[pairID].cummulativeQty);
                            if (operations_status[pairID].isMoreOnFridger) {
                                totQty = totQty.plus(operations_status_pause[pairID].executedQty);
                                totCumm = totCumm.plus(operations_status_pause[pairID].cummulativeQty)
                            }
                            let buy = closeValue.times(totQty);
                            let comission = buy.times(0.0004);
                            if (test) comission = totCumm.times(0.0008);
                            let pnlAux = totCumm.minus(buy.plus(comission));
                            let diff = pnlAux.minus(operations_status[pairID].pnl);
                            operations_status[pairID].pnl = pnlAux;
                            pnl = pnl.plus(diff);
                            if (pnl.lt(maxPNL)) {
                                maxPNL=pnl;
                            }
                            if (pnlAux.lt(-15)) {
                                // logger.info("PNL disparado: " + pnlAux + " en el par " + okex.pairs[pairID] + " side long execPrice: " + operations_status[pairID].executedPrice + " ActualPrice: " + closeValue);
                            }
                            if (pnlAux.lt(operations_status[pairID].maxPNL)) {
                                operations_status[pairID].maxPNL=pnlAux  
                            }
                            let distance = new Big(1).minus(operations_status[pairID].executedPrice.div(closeValue));
                            operations_status[pairID].distance = distance;
                            if (!operations_status[pairID].invisible) {
                                let need = new Big(0);
                                let qtyMultiplier = distance.div(percent4OneBox);
                                let cummulativeQty = totCumm.times(qtyMultiplier);
                                need = need.plus(cummulativeQty).plus(totCumm);
                                moneyNeededByRealOps = moneyNeededByRealOps.minus(operations_status[pairID].moneyNeeded);
                                moneyNeededByRealOps = moneyNeededByRealOps.plus(need);
                                operations_status[pairID].moneyNeeded = need;
                            }
                            if (!limitingops && moneyNeededByRealOps.gte(amountToStopOperatingAllPairs)) {
                                limitingops = true;
                                lastMoneyNeeded = moneyNeededByRealOps;
                                logger.info("Limitamos las operaciones de pares")
                                logger.info("************************************************")
                                selectPairsToOperate();
                                
                            }  
                            if (limitingops && moneyNeededByRealOps.lt(amountToStopOperatingAllPairs)) {
                                limitingops = false;
                                lastMoneyNeeded = new Big(0);
                                firstPairWhenLimiting = null;
                                logger.info("Finalizada la limitacion de operaciones de pares")
                                logger.info("************************************************")
                                for (let x=0;x<okex.pairs.length;x++) {
                                    operations_status[x].limitOperations = false;
                                }
                            }
                        } 
                        // if (pnl.gt(totalCumm.times(0.1))) {
                        //     logger.info("Cerramos todo");
                        //     for (let z=0;z<okex.pairs.length;z++) {
                        //         if(operations_status[z].side!="none") closePosition(z,operations_status[z].closeValue,date);
                        //     }
                        // }
                        

                       
                                
                        //Calculamos medias
                        closeValue = new Big(parseData.data[0][4]);
                        // operations_status[pairID].closeValue = closeValue
                        // let halfWay = (highValue.plus(lowValue)).div(2)
                        let vol = new Big(parseData.data[0][7])
                        if (averages[pairID].length<100){
                            averages[pairID].push(vol);
                            volumes[pairID] = volumes[pairID].plus(vol);
                        } else {
                            averages[pairID].push(vol);
                            volumes[pairID] = volumes[pairID].plus(vol);
                            volumes[pairID] = volumes[pairID].minus(averages[pairID][0]);
                            averages[pairID].splice(0,1);
                            operations_status[pairID].averageVolume = volumes[pairID].div(averages[pairID].length);
                        }

                        if (values[pairID].length<longKindles){
                            values[pairID].push(closeValue);
                            
                        } else {
                            values[pairID].push(closeValue);
                            values[pairID].splice(0,1);
                            let aux = new Big(0);
                            let aux2 = new Big(0);
                            for (let i=0;i<values[pairID].length;i++){
                                //if (i<shortKindles) aux = aux.plus(values[pairID][i]);
                                let min = longKindles-(shortKindles+1);
                                if (i>min && i<longKindles) aux = aux.plus(values[pairID][i]);
                                if (i<longKindles) aux2 = aux2.plus(values[pairID][i]);
                            }
                            lastMa20[pairID] = operations_status[pairID].ma20
                            operations_status[pairID].ma20=aux.div(shortKindles);
                            lastMa200[pairID]=operations_status[pairID].ma200
                            operations_status[pairID].ma200=aux2.div(longKindles);
                            

                            
                            // operations_status[pairID].averageVolume = new Big(100000);
                            if (lastTrend[pairID]==null) lastTrend[pairID]="none";
                            if (operations_status[pairID].ma200!=null && operations_status[pairID].lastCross!=null){
                                if (operations_status[pairID].ma200Ternd=="up" && operations_status[pairID].ma200.lt(operations_status[pairID].lastCross)){
                                    operations_status[pairID].ma200Ternd = "down"
                                    firstOp[pairID] = true;
                                    if (lastTrend[pairID]=="long") lastTrend[pairID]="none"
                                }
                                if (operations_status[pairID].ma200Ternd=="down" && operations_status[pairID].ma200.gt(operations_status[pairID].lastCross)){
                                    operations_status[pairID].ma200Ternd = "up"
                                    firstOp[pairID] = true;
                                    if (lastTrend[pairID]=="short") lastTrend[pairID]="none"
                                }
                            }
                            
                            
                            if (operations_status[pairID].ma20.gt(operations_status[pairID].ma200)) {
                                canOpen[pairID]=false
                                if (operations_status[pairID].ma20Side=="down" && operations_status[pairID].ma200Ternd == "up") {
                                    firstOp[pairID]=false;
                                    
                                }
                                if (operations_status[pairID].ma20Side=="down") {
                                    operations_status[pairID].lastCross = operations_status[pairID].ma200
                                }
                                operations_status[pairID].ma20Side="up"
                                if (operations_status[pairID].ma200Ternd=="none"){
                                    operations_status[pairID].ma200Ternd = "up"
                                }
                                
                              
                            } else if (operations_status[pairID].ma20.lt(operations_status[pairID].ma200)) {
                                canOpen[pairID]=false;
                                if (operations_status[pairID].ma20Side=="up" && operations_status[pairID].ma200Ternd == "down") {
                                    firstOp[pairID]=false;
                                    
                                }
                                if (operations_status[pairID].ma20Side=="up") {
                                    operations_status[pairID].lastCross = operations_status[pairID].ma200
                                }
                                operations_status[pairID].ma20Side="down"
                                if (operations_status[pairID].ma200Ternd=="none"){
                                    operations_status[pairID].ma200Ternd = "down"
                                }
                            }

                            
                   
                        }

                        if (ma5Values[pairID].length<5) {
                            if (ma5Sum[pairID]==null) ma5Sum[pairID]= closeValue;
                            else ma5Sum[pairID] = ma5Sum[pairID].plus(closeValue)
                            ma5Values[pairID].push(closeValue);
                        } else {
                            ma5Values[pairID].push(closeValue);
                            ma5Sum[pairID] = ma5Sum[pairID].plus(closeValue)
                            ma5Sum[pairID] = ma5Sum[pairID].minus(ma5Values[pairID][0]);
                            ma5Values[pairID].splice(0,1);
                            let ma5Aux = ma5Sum[pairID].div(5);
                            ma5[pairID].push(ma5Aux);
                            if (ma5[pairID].length>3) {
                                ma5[pairID].splice(0,1);
                            }

                        }
                        if (okex.pairs[pairID].includes("BTC")) {
                            logger.info(date + " ma20: " + operations_status[pairID].ma20 + " ma200: " + operations_status[pairID].ma200  + " lastCross: " + operations_status[pairID].lastCross);
                        }
                        // await updateVariables();

                    }
                }
		        
            // } catch (error) {
            //     logger.error("Error: " + error);
            // }
        }
    }); 
});

const addNewAction = (date,pairID,action,side,price,ma20,ma200,profit) => {
    let actionAux = {
        "timeStamp" : date,
        "par" : okex.pairs[pairID],
        "accion" : action,
        "side" : side,
        "precio" : price,
        "ma20" : ma20,
        "ma200" : ma200,
        "profit" : profit
    }
    actions[pairID].push(actionAux);
}

const checkIfChageSideNeeded = async (pairID, closeValue,percentMoveFromMax,percentMoveFromMin,oneMinuteMoveFromMax,oneMinuteMoveFromMin,fiveMinuteMoveFromMax,fiveMinuteMoveFromMin,fiveteenMinuteMoveFromMax,fiveteenMinuteMoveFromMin, amplitude) => {
    let actualTimeStamp = Date.now();
    let topLimit = candlesHigh[pairID].times(new Big(1).minus(amplitude.times(0.1)));
    let bottomLimit = candlesLow[pairID].times(new Big(1).plus(amplitude.times(0.1)));
    if (true) {
        let diffTime = actualTimeStamp-operations_status[pairID].timeStampPriceToCheckStandByLong;
        let moveFromStandBy = new Big(1).minus(closeValue.div(operations_status[pairID].priceToCheckStandByLong));
        let add =amplitude.times(0.009).div(0.045)
        let modifier3 = new Big(0.03).plus(add);
        let modifier2 = modifier3.times(0.334);
        let modifier1 = modifier2.times(0.5);
        if ((diffTime<=60000 && moveFromStandBy.gt(modifier1)) || oneMinuteMoveFromMax.gt(modifier1)) {
            if (closeValue.lt(topLimit)){
                if (!operations_status[pairID].readyShort) operations_status[pairID].readyLong = true;
                else operations_status[pairID].readyShort = false;
                operations_status[pairID].readyPrice = closeValue;
                operations_status[pairID].minFromReady = closeValue;
            }
            operations_status[pairID].priceToCheckStandByLong = closeValue;
            operations_status[pairID].priceToCheckStandByShort = closeValue;
            operations_status[pairID].timeStampPriceToCheckStandByLong = Date.now();
            operations_status[pairID].timeStampPriceToCheckStandByShort = Date.now();
            minValuesOneMin[pairID] = closeValue;
            maxValuesOneMin[pairID] = closeValue;
            oneMinTimeStamp[pairID] = actualTimeStamp;
            minValuesFiveMin[pairID] = closeValue;
            maxValuesFiveMin[pairID] = closeValue;
            fiveMinTimeStamp[pairID] = actualTimeStamp;
        } else if ((diffTime<=300000 && moveFromStandBy.gt(modifier2)) || fiveMinuteMoveFromMax.gt(modifier2)) {
            if (closeValue.lt(topLimit)){
                if (!operations_status[pairID].readyShort) operations_status[pairID].readyLong = true;
                else operations_status[pairID].readyShort = false;
                operations_status[pairID].readyPrice = closeValue;
                operations_status[pairID].minFromReady = closeValue;
            }
            operations_status[pairID].priceToCheckStandByLong = closeValue;
            operations_status[pairID].priceToCheckStandByShort = closeValue;
            operations_status[pairID].timeStampPriceToCheckStandByLong = Date.now();
            operations_status[pairID].timeStampPriceToCheckStandByShort = Date.now();
            minValuesOneMin[pairID] = closeValue;
            maxValuesOneMin[pairID] = closeValue;
            oneMinTimeStamp[pairID] = actualTimeStamp;
            minValuesFiveMin[pairID] = closeValue;
            maxValuesFiveMin[pairID] = closeValue;
            fiveMinTimeStamp[pairID] = actualTimeStamp;
        } 
        
    }
    if (true) {
        let diffTime = actualTimeStamp-operations_status[pairID].timeStampPriceToCheckStandByShort;
        let moveFromStandBy = new Big(1).minus(operations_status[pairID].priceToCheckStandByShort.div(closeValue));
        let add =amplitude.times(0.009).div(0.045)
        let modifier3 = new Big(0.03).plus(add);
        let modifier2 = modifier3.times(0.334);
        let modifier1 = modifier2.times(0.5);
        if ((diffTime<=60000 && moveFromStandBy.gt(modifier1)) || oneMinuteMoveFromMin.gt(modifier1)) {
            if (closeValue.gt(bottomLimit)){
                if (!operations_status[pairID].readyLong) operations_status[pairID].readyShort = true;
                else operations_status[pairID].readyLong = false;
                operations_status[pairID].readyPrice = closeValue;
                operations_status[pairID].minFromReady = closeValue;
            }
            operations_status[pairID].priceToCheckStandByLong = closeValue;
            operations_status[pairID].priceToCheckStandByShort = closeValue;
            operations_status[pairID].timeStampPriceToCheckStandByLong = Date.now();
            operations_status[pairID].timeStampPriceToCheckStandByShort = Date.now();
            minValuesOneMin[pairID] = closeValue;
            maxValuesOneMin[pairID] = closeValue;
            oneMinTimeStamp[pairID] = actualTimeStamp;
            minValuesFiveMin[pairID] = closeValue;
            maxValuesFiveMin[pairID] = closeValue;
            fiveMinTimeStamp[pairID] = actualTimeStamp;
        } else if ((diffTime<=300000 && moveFromStandBy.gt(modifier2)) || fiveMinuteMoveFromMin.gt(modifier2)) {
            if (closeValue.gt(bottomLimit)){
                if (!operations_status[pairID].readyLong) operations_status[pairID].readyShort = true;
                else operations_status[pairID].readyLong = false;
                operations_status[pairID].readyPrice = closeValue;
                operations_status[pairID].minFromReady = closeValue;
            }
            operations_status[pairID].priceToCheckStandByLong = closeValue;
            operations_status[pairID].priceToCheckStandByShort = closeValue;
            operations_status[pairID].timeStampPriceToCheckStandByLong = Date.now();
            operations_status[pairID].timeStampPriceToCheckStandByShort = Date.now();
            minValuesOneMin[pairID] = closeValue;
            maxValuesOneMin[pairID] = closeValue;
            oneMinTimeStamp[pairID] = actualTimeStamp;
            minValuesFiveMin[pairID] = closeValue;
            maxValuesFiveMin[pairID] = closeValue;
            fiveMinTimeStamp[pairID] = actualTimeStamp;
        } 
    } 
}

const selectPairsToOperate = () => {
    let bigger = 0;
    firstPairWhenLimiting = null
    let biggerAmount = new Big(0);
    for (let pairID=0;pairID<okex.pairs.length;pairID++) {
        operations_status[pairID].limitOperations = true;
        if (operations_status[pairID].side!="none") {
            let totCumm = operations_status[pairID].cummulativeQty;
            if (operations_status[pairID].isMoreOnFridger) totCumm = totCumm.plus(operations_status_pause[pairID].cummulativeQty)
            if (biggerAmount.lt(totCumm) && !operations_status[pairID].stopOperating) {
                biggerAmount = new Big(totCumm);
                bigger = pairID;
            }
        }
    }
   
    logger.info("Con la limitacion seguiran operando los pares: " + okex.pairs[bigger] + " y el primero que intente meter nivel");
    logger.info("***************************************************************************")
    operations_status[bigger].limitOperations = false;
}

const startPosition = (pairID, side,date , price) => {
    //MODIFICADO PARA SIMU
    let closeValue = operations_status[pairID].ma20;
    if (price!= null) closeValue = price
    // let closeValue = operations_status[pairID].closeValue;
    logger.info("Iniciamos proceso para abrir el par " + okex.pairs[pairID]);
    //LONG
    if (privateChannelUp && operations_status[pairID].state=="none" && side=="long" && !stopOpening && openOperations<maxOpenPairs ) {
        operations_status[pairID].state = "starting";
        let cummulativeQty = minInitialBet; 
        let qty = cummulativeQty.div(closeValue); 
        if (!test) {
            // let params = new URLSearchParams();
            // params.append("pairId", pairID);
            // params.append("price", closeValue);
            
            checkPairStep(qty,pairID)
            .then(qty => {
                if (qty>0){
                    logger.info("Enviamos a okex la operacion "  + okex.instId[pairID]);
                    okex.placeOrder(okex.instId[pairID], "market", "buy", "long", 0, qty)
                    .then(answer => {
                        if (answer=="error" || answer.code==null || answer.code!="0") {
                            operations_status[pairID].state="none";
                            logger.info("********************************************************************")
                            logger.info("********************************************************************")
                            logger.info("*****************MARKET ANSWER******************************************")
                            logger.info("********************************************************************")
                            logger.info("********************************************************************")
                            logger.info(JSON.stringify(answer,null,2))
                        } else {
                            operations_status[pairID].marketOpTimestamp = Date.now()
                        }
                    })
                } else {
                    logger.info("25$ no llegan para la cantidad mínima, cancelamos");
                    operations_status[pairID].state="none";
                }
            })
            
            

            
        } else {
            operations_status[pairID].side = "long";
            operations_status[pairID].executedPrice = closeValue;
            operations_status[pairID].executedQty = qty;
            operations_status[pairID].cummulativeQty = cummulativeQty
            operations_status[pairID].lastExecPrice = closeValue;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level = 0;
            operations_status[pairID].startAmount = cummulativeQty;
            operations_status[pairID].timesMoving = 1;
            addNewAction(date, pairID, "open", operations_status[pairID].side, closeValue, operations_status[pairID].ma20, operations_status[pairID].ma200, 0);
            realOpsStartAmount = realOpsStartAmount.plus(cummulativeQty);
            totalCumm = totalCumm.plus(cummulativeQty);
            if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            operations_status[pairID].state="none";
            openOperations++;
            logger.info(date + ": " +"Abrimos long el par " + okex.pairs[pairID] + ". Inversion: " + cummulativeQty + " Precio: " + closeValue);
            logger.info("********************************************************************")
        }  
    }

    //SHORT
    if (privateChannelUp && operations_status[pairID].state=="none" && side=="short" && !stopOpening && openOperations<maxOpenPairs ) {
        operations_status[pairID].state = "starting";
        let cummulativeQty = minInitialBet
        let qty = cummulativeQty.div(closeValue);
        if (!test) {
            // let params = new URLSearchParams();
            // params.append("pairId", pairID);
            // params.append("price", closeValue);
            
            checkPairStep(qty,pairID)
            .then(qty => {
                if (qty>0){
                    logger.info("Enviamos a okex la operacion");
                    okex.placeOrder(okex.instId[pairID], "market", "sell", "short", 0, qty)
                    .then(answer => {
                        if (answer=="error" || answer.code==null || answer.code!="0") {
                            operations_status[pairID].state="none";
                            logger.info("********************************************************************")
                            logger.info("********************************************************************")
                            logger.info("*****************MARKET ANSWER******************************************")
                            logger.info("********************************************************************")
                            logger.info("********************************************************************")
                            logger.info(JSON.stringify(answer,null,2))
                        } else {
                            operations_status[pairID].marketOpTimestamp = Date.now()
                        }
                    })
                } else {
                    logger.info("25$ no llegan para la cantidad mínima, cancelamos");
                    operations_status[pairID].state="none";
                }
            })


            
        } else {
            operations_status[pairID].side = "short";
            operations_status[pairID].executedPrice = closeValue;
            operations_status[pairID].executedQty = qty;
            operations_status[pairID].cummulativeQty = cummulativeQty
            operations_status[pairID].lastExecPrice = closeValue;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level = 0;
            operations_status[pairID].startAmount = cummulativeQty;
            operations_status[pairID].timesMoving = 1;
            addNewAction(date, pairID, "open", operations_status[pairID].side, closeValue, operations_status[pairID].ma20, operations_status[pairID].ma200, 0);
            realOpsStartAmount = realOpsStartAmount.plus(cummulativeQty);
            totalCumm = totalCumm.plus(cummulativeQty);
            if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            operations_status[pairID].state="none";
            openOperations++;
            logger.info(date + ": " +"Abrimos short el par " + okex.pairs[pairID] + ". Inversion: " + cummulativeQty + " Precio: " + closeValue);
            logger.info("********************************************************************")
        } 
    }

}

const startPositionManually = (pair, side, cumm) => {
    let pairID = okex.pairs.indexOf(pair)
    let closeValue = operations_status[pairID].closeValue;

    //LONG
    if (privateChannelUp && operations_status[pairID].side=="none" && operations_status[pairID].state=="none" && side=="long" && !okex.pairs[pairID].includes("LON-")) {
        operations_status[pairID].state = "starting";
        let cummulativeQty =minInitialBet;
        // if (operations_status_long[pairID].cummulativeQty!=null) cummulativeQty = operations_status_long[pairID].cummulativeQty.times(realBetQtyMultiplierLong);
        // if (cummulativeQty.lt(minInitialBet)) cummulativeQty = minInitialBet;
        // if (cummulativeQty.gt(maxInitialBet)) cummulativeQty = maxInitialBet;
        // if ((realOpsStartAmount.plus(cummulativeQty)).gt(realOpsStartAmountLimit) && (realOpsStartAmountLimit.minus(realOpsStartAmount)).gte(minInitialBet)) cummulativeQty = realOpsStartAmountLimit.minus(realOpsStartAmount);
        if (cumm!=null) cummulativeQty=new Big(cumm);
        let qty = cummulativeQty.div(closeValue);
        if (operations_status[pairID].forceNextLevelAt!=null){
            operations_status[pairID].forceNextLevelAt=null;
        }  
        if (operations_status[pairID].forceOpenAt!=null){
            operations_status[pairID].forceOpenAt=null;
            operations_status[pairID].forceOpenAtQty=null;
        }  
        if (!test) {
            operations_status[pairID].side = "long";
            anotherOrder(pairID,"buy","market", qty, 0, "long");  
            
        } else {
            operations_status[pairID].side = "long";
            operations_status[pairID].executedPrice = closeValue;
            operations_status[pairID].executedQty = qty;
            operations_status[pairID].cummulativeQty = cummulativeQty
            operations_status[pairID].lastExecPrice = closeValue;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level = 0;
            operations_status[pairID].startAmount = cummulativeQty;
            realOpsStartAmount = realOpsStartAmount.plus(cummulativeQty);
            totalCumm = totalCumm.plus(cummulativeQty);
            if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            operations_status[pairID].state="none";
            logger.info("Abrimos long el par " + okex.pairs[pairID] + ". Inversion: " + cummulativeQty);
            logger.info("********************************************************************")
        }
       
        
    }

    //SHORT
    if (privateChannelUp && operations_status[pairID].side=="none" && operations_status[pairID].state=="none" && side=="short") {
        operations_status[pairID].state = "starting";
        let cummulativeQty = minInitialBet; 
        // if (operations_status_short[pairID].cummulativeQty!=null) cummulativeQty = operations_status_short[pairID].cummulativeQty.times(realBetQtyMultiplierShort)
        // if (cummulativeQty.lt(minInitialBet)) cummulativeQty = minInitialBet;
        // if (cummulativeQty.gt(maxInitialBet)) cummulativeQty = maxInitialBet;
        // if ((realOpsStartAmount.plus(cummulativeQty)).gt(realOpsStartAmountLimit) && (realOpsStartAmountLimit.minus(realOpsStartAmount)).gte(minInitialBet)) cummulativeQty = realOpsStartAmountLimit.minus(realOpsStartAmount);
        if (cumm!=null) cummulativeQty=new Big(cumm);
        let qty = cummulativeQty.div(closeValue);
        if (!test) {
            operations_status[pairID].side = "short";
            anotherOrder(pairID,"sell","market", qty, 0, "short");  
        } else {
            operations_status[pairID].side = "short";
            operations_status[pairID].executedPrice = closeValue;
            operations_status[pairID].executedQty = qty;
            operations_status[pairID].cummulativeQty = cummulativeQty
            operations_status[pairID].lastExecPrice = closeValue;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level = 0;
            operations_status[pairID].startAmount = cummulativeQty;
            realOpsStartAmount = realOpsStartAmount.plus(cummulativeQty);
            totalCumm = totalCumm.plus(cummulativeQty);
            if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            operations_status[pairID].state="none";
            logger.info("Abrimos short el par " + okex.pairs[pairID] + ". Inversion: " + cummulativeQty);
            logger.info("********************************************************************")
        }
        
        
        
    }

}

const startPositionMoving = (pairID, side, cumm) => {
    let closeValue = operations_status[pairID].closeValue;

    //LONG
    if (privateChannelUp && operations_status[pairID].side=="none" && operations_status[pairID].state=="none" && side=="long") {
        operations_status[pairID].state = "moving";
        let cummulativeQty =new Big(cumm);
        let qty = cummulativeQty.div(closeValue);
        if (operations_status[pairID].forceNextLevelAt!=null){
            operations_status[pairID].forceNextLevelAt=null;
        }  
        if (operations_status[pairID].forceOpenAt!=null){
            operations_status[pairID].forceOpenAt=null;
            operations_status[pairID].forceOpenAtQty=null;
        }  
        if (!test) {
            operations_status[pairID].side = "long";
            anotherOrder(pairID,"buy","market", qty, 0, "long");  
        } 
       
        
    }

    //SHORT
    if (privateChannelUp && operations_status[pairID].side=="none" && operations_status[pairID].state=="none" && side=="short") {
        operations_status[pairID].state = "moving";
        let cummulativeQty =new Big(cumm);
        let qty = cummulativeQty.div(closeValue);
        if (operations_status[pairID].forceNextLevelAt!=null){
            operations_status[pairID].forceNextLevelAt=null;
        }  
        if (operations_status[pairID].forceOpenAt!=null){
            operations_status[pairID].forceOpenAt=null;
            operations_status[pairID].forceOpenAtQty=null;
        }  
        if (!test) {
            operations_status[pairID].side = "short";
            anotherOrder(pairID,"sell","market", qty, 0, "short");  
        }    
    }

}

const levelPosition = (pairID, isManualLevel,date) => {
    logger.info("Entramos a subir nivel del par: " + okex.pairs[pairID] + " sentido " + operations_status[pairID].side);
    //LONG
    let closeValue = operations_status[pairID].ma20;
    if (privateChannelUp && operations_status[pairID].state=="none" && operations_status[pairID].side=="long") {
        if (limitingops && firstPairWhenLimiting==null) {
            firstPairWhenLimiting=pairID;
            operations_status[pairID].limitOperations=false;
        }
        operations_status[pairID].state = "leveling";
        if (operations_status[pairID].forceNextLevelAt!=null){
            operations_status[pairID].forceNextLevelAt=null;
        }
        let distance = new Big(1).minus(closeValue.div(operations_status[pairID].executedPrice));
        let qtyMultiplier = distance.div(percent4OneBox);
        let cummulativeQty = operations_status[pairID].cummulativeQty/*.times(qtyMultiplier)*/;
        logger.info("Distance: " + distance + " closeValue: " + closeValue + " execPrice: " + operations_status[pairID].executedPrice + " cummulative: " + cummulativeQty)
        if (cummulativeQty.lt(minInitialBet)) cummulativeQty = new Big(minInitialBet);
        //if (cummulativeQty.gt(operations_status[pairID].cummulativeQty)) cummulativeQty = operations_status[pairID].cummulativeQty
        
        // cummulativeQty = operations_status[pairID].cummulativeQty
        let qty = cummulativeQty.div(closeValue);
        
        let cummAux = cummulativeQty.plus(operations_status[pairID].cummulativeQty);
        let cummAuxWithFridge = cummAux;
        if (operations_status_pause[pairID]!=null && operations_status_pause[pairID].cummulativeQty!=null) cummAuxWithFridge = cummAux.plus(operations_status_pause[pairID].cummulativeQty)
        if ((totalCumm.plus(cummulativeQty)).gt(limitInvestment) && !isManualLevel) {
            investLimitReached = true;
            operations_status[pairID].state = "none";
            logger.info("Bloqueada subida de nivel por pasarnos el limite de inversión.")
        } else if (cummAuxWithFridge.gt(limitInvestmentPerPair) && !isManualLevel){
            operations_status[pairID].state = "none";
            logger.info("Bloqueada subida de nivel por pasarnos el limite de inversión en ese par. limite: " + limitInvestmentPerPair + " total en par: " + cummAux);
        } else {
            if (!test) {
                logger.info("Cumm: " + cummulativeQty + " Qty antes de check: " + qty);
                okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
                .then(cancelAnswer => {
                    if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                        operations_status[pairID].orderId = null;
                        anotherOrder(pairID,"buy","market",qty,0,"long");                               
                    } else {
                        operations_status[pairID].state="none"
                        if (operations_status[pairID].orderId==null) {
                            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                            multAux = multAux.plus(1.01);
                            let closePrice = operations_status[pairID].executedPrice.times(multAux);
                            checkPrice(closePrice,pairID)
                                .then(closePrice => {
                                    okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                                        .then(answer => {
                                            if (answer=="error"){
                                                operations_status[pairID].state="noClosingOrder";
                                                operations_status[pairID].state="none";
                                            } else {
                                                operations_status[pairID].state="none";
                                                operations_status[pairID].orderId=answer;
                                                logger.info("Puesta orden de cierre");
                                            }
                                        })
                                })   
                        }
                    }
                })

            } else {
                let totalQty = qty.plus(operations_status[pairID].executedQty);
                let totalCummlativeQty = cummulativeQty.plus(operations_status[pairID].cummulativeQty);
                if (totalCummlativeQty.gt(operations_status[pairID].maxInvest)) operations_status[pairID].maxInvest=totalCummlativeQty;
                let execprice = totalCummlativeQty.div(totalQty);
                operations_status[pairID].executedPrice = execprice;
                operations_status[pairID].executedQty = totalQty;
                operations_status[pairID].cummulativeQty = totalCummlativeQty;
                operations_status[pairID].lastExecPrice = closeValue;
                operations_status[pairID].lastExecTime = Date.now();
                operations_status[pairID].level++; 
                totalCumm = totalCumm.plus(cummulativeQty);
                if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
                operations_status[pairID].state="none";
                addNewAction(date, pairID, "level", operations_status[pairID].side, closeValue, operations_status[pairID].ma20, operations_status[pairID].ma200, 0);
                logger.info(date + ": " +"Ampliamos long el par " + okex.pairs[pairID] + ". Inversion: " + totalCummlativeQty  + " Precio: " + closeValue);
                logger.info("********************************************************************")
            }
        }
        
    }

    //SHORT
    if (privateChannelUp && operations_status[pairID].state=="none" && operations_status[pairID].side=="short") {
        if (limitingops && firstPairWhenLimiting==null) {
            firstPairWhenLimiting=pairID;
            operations_status[pairID].limitOperations=false;
        }
        operations_status[pairID].state = "leveling";
        if (operations_status[pairID].forceNextLevelAt!=null){
            operations_status[pairID].forceNextLevelAt=null;
        }
        let distance = new Big(1).minus(operations_status[pairID].executedPrice.div(closeValue));
        let qtyMultiplier = distance.div(percent4OneBox);
        let cummulativeQty = operations_status[pairID].cummulativeQty/*.times(qtyMultiplier)*/;
        if (cummulativeQty.lt(minInitialBet)) cummulativeQty = new Big(minInitialBet);
        logger.info("Distance: " + distance + " closeValue: " + closeValue + " execPrice: " + operations_status[pairID].executedPrice + " cummulative: " + cummulativeQty)
        // cummulativeQty = operations_status[pairID].cummulativeQty
        let qty = cummulativeQty.div(closeValue);
        let cummAux = cummulativeQty.plus(operations_status[pairID].cummulativeQty);
        let cummAuxWithFridge = cummAux;
        if (operations_status_pause[pairID]!=null && operations_status_pause[pairID].cummulativeQty!=null) cummAuxWithFridge = cummAux.plus(operations_status_pause[pairID].cummulativeQty)
        if ((totalCumm.plus(cummulativeQty)).gt(limitInvestment) && !isManualLevel) {
            investLimitReached = true;
            operations_status[pairID].state = "none";
            logger.info("Bloqueada subida de nivel por pasarnos el limite de inversión.")
        } else if (cummAuxWithFridge.gt(limitInvestmentPerPair) && !isManualLevel){
            operations_status[pairID].state = "none";
            logger.info("Bloqueada subida de nivel por pasarnos el limite de inversión en ese par. limite: " + limitInvestmentPerPair + " total en par: " + cummAux);
        } else {
            if (!test) {
                logger.info("Cumm: " + cummulativeQty + " Qty antes de check: " + qty);
                    okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
                    .then(cancelAnswer => {
                        if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                            operations_status[pairID].orderId = null;
                            anotherOrder(pairID,"sell","market",qty,0,"short");
                        } else {
                            operations_status[pairID].state="none";
                            if (operations_status[pairID].orderId==null) {
                                let closePrice = operations_status[pairID].executedPrice.times(0.99);
                                checkPrice(closePrice,pairID)
                                    .then(closePrice => {
                                        okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                                            .then(answer => {
                                                if (answer=="error"){
                                                    operations_status[pairID].state="noClosingOrder";
                                                    operations_status[pairID].state="none";
                                                } else {
                                                    operations_status[pairID].state="none";
                                                    operations_status[pairID].orderId=answer;
                                                    logger.info("Puesta orden de cierre");
                                                }
                                            }) 
                                    })
                            }
                        }
                    })  
            } else {
                let totalQty = qty.plus(operations_status[pairID].executedQty);
                let totalCummlativeQty = cummulativeQty.plus(operations_status[pairID].cummulativeQty);
                if (totalCummlativeQty.gt(operations_status[pairID].maxInvest)) operations_status[pairID].maxInvest=totalCummlativeQty;
                let execprice = totalCummlativeQty.div(totalQty);
                operations_status[pairID].executedPrice = execprice;
                operations_status[pairID].executedQty = totalQty;
                operations_status[pairID].cummulativeQty = totalCummlativeQty;
                operations_status[pairID].lastExecPrice = closeValue;
                operations_status[pairID].lastExecTime = Date.now();
                operations_status[pairID].level++; 
                totalCumm = totalCumm.plus(cummulativeQty);
                if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
                operations_status[pairID].state="none";
                addNewAction(date, pairID, "open", operations_status[pairID].side, closeValue, operations_status[pairID].ma20, operations_status[pairID].ma200, 0);
                logger.info(date + ": " +"Ampliamos short el par " + okex.pairs[pairID] + ". Inversion: " + totalCummlativeQty  + " Precio: " + closeValue);
                logger.info("********************************************************************")
            }
        }
          
    }

}

const changeSide = (pairID, closeValue) => {
    logger.info("Cambiamos de sentido el par " + okex.pairs[pairID] + " estaba en sentido " + operations_status[pairID].side + " execPrice: " + operations_status[pairID].executedPrice + " precio: " + closeValue);
    operations_status[pairID].timesMoving++;
    if (operations_status[pairID].side=="long") {
        operations_status[pairID].side="short"
        let loose = closeValue.div(operations_status[pairID].executedPrice)
        loose = new Big(1).div(loose);
        operations_status[pairID].executedPrice = closeValue.div(loose);
        operations_status[pairID].executedQty = operations_status[pairID].cummulativeQty.div(operations_status[pairID].executedPrice);
        loose = closeValue.div(operations_status[pairID].lastExecPrice)
        loose = new Big(1).div(loose);
        operations_status[pairID].lastExecPrice = closeValue.div(loose);
    }
    else if (operations_status[pairID].side=="short") {
        operations_status[pairID].side="long"
        let loose = operations_status[pairID].executedPrice.div(closeValue)
        loose = new Big(1).div(loose);
        operations_status[pairID].executedPrice = closeValue.times(loose);
        operations_status[pairID].executedQty = operations_status[pairID].cummulativeQty.div(operations_status[pairID].executedPrice);
        loose = operations_status[pairID].lastExecPrice.div(closeValue)
        loose = new Big(1).div(loose);
        operations_status[pairID].lastExecPrice = closeValue.times(loose);
    }
    logger.info("Nuevo execPrice: " + operations_status[pairID].executedPrice);
}

const closePosition = (pairID ,closePrice,date) => {
    if (test && operations_status[pairID].side=="short") {
            let closeValue = closePrice
            openOperations--;
            // let margin = operations_status[pairID].executedPrice.div(closeValue).minus(1);
            // let profit = new Big(operations_status[pairID].cummulativeQty).times(margin.minus(operations_status[pairID].timesMoving*(0.0008)));

            let cumm = operations_status[pairID].executedQty.times(closePrice);
            let feeAux = (cumm.plus(operations_status[pairID].cummulativeQty)).times(0.0004)
            let profit = operations_status[pairID].cummulativeQty.minus(cumm).minus(feeAux)
            operations_status[pairID].profit= operations_status[pairID].profit.plus(profit);
            totalProfitit = totalProfitit.plus(profit);
            totalCerrado = totalCerrado.plus(operations_status[pairID].cummulativeQty);
            closedProfit = closedProfit.plus(profit);
            // if (realCash.gt(maxProfit)) {
            //     let maxPerdidaAux = maxProfit.minus(minProfit);
            //     if (maxPerdidaAux.gt(maxPerdida)) {
            //         maxPerdida=maxPerdidaAux
            //         dropDownPercent = maxPerdida.times(100).div(maxProfit);
            //     }
            //     maxProfit = realCash;
            //     minProfit = realCash;
            // } else if ((realCash.plus(pnl)).lt(minProfit)){
            //     minProfit = realCash.plus(pnl);
            // }
            if (closedProfit.gt(maxProfit)) {
                let maxPerdidaAux = maxProfit.minus(minProfit);
                if (maxPerdidaAux.gt(maxPerdida)  && maxProfit.gt(0)) {
                    maxPerdida=maxPerdidaAux
                    dropDownPercent = maxPerdida.times(100).div(maxProfit);
                }
                maxProfit = closedProfit;
                minProfit = closedProfit;
            } else if (closedProfit.lt(minProfit)){
                minProfit = closedProfit;
            }
            addNewAction(date, pairID, "close", operations_status[pairID].side, closeValue, operations_status[pairID].ma20, operations_status[pairID].ma200, profit);
            totalCumm = totalCumm.minus(operations_status[pairID].cummulativeQty);
            if (investLimitReached && totalCumm.lt(limitInvestment)) investLimitReached = false;
            logger.info(date + ": " +"Cerramos el par:" + okex.pairs[pairID] + " Precio: " + closeValue +  " Profit: " + profit + " acumulado: " + operations_status[pairID].profit);
            logger.info("Profit total: " + totalProfitit);
            logger.info("****************************************************************************");
            operations_status[pairID].side="none";
            operations_status[pairID].status="none";
            pnl = pnl.minus(operations_status[pairID].pnl);
            operations_status[pairID].pnl=0;   
            moneyNeededByRealOps = moneyNeededByRealOps.minus(operations_status[pairID].moneyNeeded);
            operations_status[pairID].moneyNeeded = new Big(0);
            realOpsStartAmount = realOpsStartAmount.minus(operations_status[pairID].startAmount);
            operations_status[pairID].startAmount = new Big(0);
            operations_status[pairID].moneyNeeded = new Big(0);
            operations_status[pairID].startAmount = new Big(0);
            operations_status[pairID].lastExecTime = null;
            operations_status[pairID].executedPrice = new Big(0);
            operations_status[pairID].cummulativeQty = new Big(0);
            operations_status[pairID].executedQty = new Big(0);
            if (operations_status_pause[pairID]!=null) {
                logger.info("Recuperamos operación de la nevera. Cantidad: " + operations_status_pause[pairID].cummulativeQty)
                operations_status[pairID].executedPrice=new Big(operations_status_pause[pairID].execPrice);
                operations_status[pairID].executedQty=new Big(operations_status_pause[pairID].executedQty);
                operations_status[pairID].cummulativeQty=new Big(operations_status_pause[pairID].cummulativeQty);
                operations_status[pairID].lastExecPrice=new Big(operations_status_pause[pairID].lastExecPrice);
                operations_status[pairID].partialProfit=new Big(0);
                operations_status_pause[pairID] = null;
                operations_status[pairID].isMoreOnFridger = false;
                operations_status[pairID].comesFromFridger = true;
                moneyInFridger = moneyInFridger.minus(operations_status[pairID].cummulativeQty);
                totalCumm = totalCumm.plus(operations_status[pairID].cummulativeQty);
                if (operations_status[pairID].timesDivideAndConquer>0) operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer-1;
            }
            if (limitingops && moneyNeededByRealOps.lt(amountToStopOperatingAllPairs)) {
                limitingops = false;
                lastMoneyNeeded = new Big(0);
                firstPairWhenLimiting = null;
                logger.info("Finalizada la limitacion de operaciones de pares")
                logger.info("************************************************")
                for (let x=0;x<okex.pairs.length;x++) {
                    operations_status[x].limitOperations = false;
                }
            } 
            if (limitingops) selectPairsToOperate();  
                
            
            
        
    } else if (test && operations_status[pairID].side=="long") {
        
            let closeValue = closePrice;
            openOperations--;
            // let margin = closeValue.div(operations_status[pairID].executedPrice).minus(1);
            // let profit = new Big(operations_status[pairID].cummulativeQty).times(margin.minus(operations_status[pairID].timesMoving*(0.0008)));  

            let cumm = operations_status[pairID].executedQty.times(closePrice);
            let feeAux = (cumm.plus(operations_status[pairID].cummulativeQty)).times(0.0004)
            let profit = cumm.minus(operations_status[pairID].cummulativeQty).minus(feeAux)

            operations_status[pairID].profit= operations_status[pairID].profit.plus(profit);
            totalProfitit = totalProfitit.plus(profit);
            totalCerrado = totalCerrado.plus(operations_status[pairID].cummulativeQty);
            closedProfit = closedProfit.plus(profit);
            // if (realCash.gt(maxProfit)) {
            //     let maxPerdidaAux = maxProfit.minus(minProfit);
            //     if (maxPerdidaAux.gt(maxPerdida)) {
            //         maxPerdida=maxPerdidaAux
            //         dropDownPercent = maxPerdida.times(100).div(maxProfit);
            //     }
            //     maxProfit = realCash;
            //     minProfit = realCash;
            // } else if ((realCash.plus(pnl)).lt(minProfit)){
            //     minProfit = realCash.plus(pnl);
            // }
            if (closedProfit.gt(maxProfit)) {
                let maxPerdidaAux = maxProfit.minus(minProfit);
                if (maxPerdidaAux.gt(maxPerdida) && maxProfit.gt(0)) {
                    maxPerdida=maxPerdidaAux
                    dropDownPercent = maxPerdida.times(100).div(maxProfit);
                }
                maxProfit = closedProfit;
                minProfit = closedProfit;
            } else if (closedProfit.lt(minProfit)){
                minProfit = closedProfit;
            }
            addNewAction(date, pairID, "close", operations_status[pairID].side, closeValue, operations_status[pairID].ma20, operations_status[pairID].ma200, profit);
            totalCumm = totalCumm.minus(operations_status[pairID].cummulativeQty);
            if (investLimitReached && totalCumm.lt(limitInvestment)) investLimitReached = false;
            logger.info(date + ": " +"Cerramos el par:" + okex.pairs[pairID] + " Precio: " + closeValue + " Profit: " + profit + " acumulado: " + operations_status[pairID].profit);
            logger.info("Profit total: " + totalProfitit);
            logger.info("****************************************************************************");
            operations_status[pairID].side="none";
            operations_status[pairID].status="none";
            pnl = pnl.minus(operations_status[pairID].pnl);
            operations_status[pairID].pnl=0;
            moneyNeededByRealOps = moneyNeededByRealOps.minus(operations_status[pairID].moneyNeeded);
            operations_status[pairID].moneyNeeded = new Big(0);
            realOpsStartAmount = realOpsStartAmount.minus(operations_status[pairID].startAmount);
            operations_status[pairID].startAmount = new Big(0);
            operations_status[pairID].moneyNeeded = new Big(0);
            operations_status[pairID].startAmount = new Big(0);
            operations_status[pairID].lastExecTime = null;
            operations_status[pairID].executedPrice = new Big(0);
            operations_status[pairID].cummulativeQty = new Big(0);
            operations_status[pairID].executedQty = new Big(0);
            if (operations_status_pause[pairID]!=null) {
                logger.info("Recuperamos operación de la nevera. Cantidad: " + operations_status_pause[pairID].cummulativeQty)
                operations_status[pairID].executedPrice=new Big(operations_status_pause[pairID].execPrice);
                operations_status[pairID].executedQty=new Big(operations_status_pause[pairID].executedQty);
                operations_status[pairID].cummulativeQty=new Big(operations_status_pause[pairID].cummulativeQty);
                operations_status[pairID].lastExecPrice=new Big(operations_status_pause[pairID].lastExecPrice);
                operations_status[pairID].partialProfit=new Big(0);
                operations_status_pause[pairID] = null;
                operations_status[pairID].isMoreOnFridger = false;
                operations_status[pairID].comesFromFridger = true;
                moneyInFridger = moneyInFridger.minus(operations_status[pairID].cummulativeQty);
                totalCumm = totalCumm.plus(operations_status[pairID].cummulativeQty);
                if (operations_status[pairID].timesDivideAndConquer>0) operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer-1;
            }
            if (limitingops && moneyNeededByRealOps.lt(amountToStopOperatingAllPairs)) {
                limitingops = false;
                lastMoneyNeeded = new Big(0);
                firstPairWhenLimiting = null;
                logger.info("Finalizada la limitacion de operaciones de pares")
                logger.info("************************************************")
                for (let x=0;x<okex.pairs.length;x++) {
                    operations_status[x].limitOperations = false;
                }
            } 
            if (limitingops) selectPairsToOperate();
            
            
        
    } 
}

const anotherOrder = async (pairID,side,type,qty,price,posSide) => {
    logger.info("Tenemos que poner una orden");
    let qtyLimit = new Big(0);
    let sobrante = 0;
    let orderQty = new Big(await checkPairStepCeil(qty,pairID));
    if (type=="limit") {
        logger.info("Type: " + type + " Maximo: " + okex.maxQty[pairID]);
        qtyLimit = new Big(okex.maxQty[pairID])
    } else if (type=="market") {
        logger.info("Type: " + type + " Maximo: " + okex.marketMaxQty[pairID]);
        qtyLimit = new Big(okex.marketMaxQty[pairID])
    } else {
        logger.info("Error en el tipo de orden");
    }
    logger.info("Qty: " + orderQty + " Maxqty:" + qtyLimit);
    if (orderQty.gt(qtyLimit)) {
        logger.info("Cantidad supera limite. QTY: " + orderQty +" limite: "+ qtyLimit);
        sobrante = orderQty.minus(qtyLimit);
        orderQty = qtyLimit;
        logger.info("Nueva QTY: " + orderQty + " sobrante: " + sobrante);
        operations_status[pairID].moreOrders=true;
        operations_status[pairID].moreOrdersRemain = sobrante.times(okex.ctVal[pairID]);
    } else {
        operations_status[pairID].moreOrders=false;
        operations_status[pairID].moreOrdersRemain = new Big(0);
    }
    okex.placeOrder(okex.instId[pairID], type, side, posSide, price, orderQty)
        .then(async answer => {
            if (answer=="error" || answer==null || answer.code!="0") {
                logger.info("Error al intentar poner la orden");
                if (answer.data!=null && answer.data[0].sCode=="51004") {
                    logger.info("Toca bajar el apalancamiento del par " + okex.pairs[pairID]);
                    let newLeverage = operations_status[pairID].leverage-2;
                    okex.changeLeverage(okex.instId[pairID],newLeverage)
                        .then(answer => {
                            logger.info(JSON.stringify(answer,null,2));
                            if (answer=="error"  || answer==null || answer.code!="0") {
                                logger.info("Error al cambiar el apalancamiento");
                                operations_status[pairID].state="noClosingOrder"
                            } else {
                                operations_status[pairID].leverage= newLeverage;
                                logger.info("Apalancamiento cambiado correctamente para el par " +  okex.pairs[pairID]);
                                anotherOrder(pairID,side,type,qty,price,posSide);
                            }
                        })
                } else {
                    await sleep(500);
                    anotherOrder(pairID,side,type,qty,price,posSide)
                }
            } else {
                operations_status[pairID].marketOpTimestamp=Date.now();
                logger.info("La orden se ha puesto correctamente");
            }
            
        })

}

const checkPairStep = (quantity, pairID) => {
    return new Promise(resolve => {
        quantity = new Big(quantity).div(okex.ctVal[pairID]);
        const aux = quantity.div(okex.stepSize[pairID]);
        const aux2 = Math.floor(aux);
        quantity = new Big(aux2).times(okex.stepSize[pairID]);
        resolve(quantity.toFixed(okex.quantityPrecision[pairID]));
    })
}

const checkPairStepCeil = (quantity, pairID) => {
    return new Promise(resolve => {
        quantity = new Big(quantity).div(okex.ctVal[pairID]);
        const aux = quantity.div(okex.stepSize[pairID]);
        const aux2 = Math.ceil(aux);
        quantity = new Big(aux2).times(okex.stepSize[pairID]);
        resolve(quantity.toFixed(okex.quantityPrecision[pairID]));
    })
}

const checkPrice = (price, pairID) => {
    return new Promise(resolve => {
        price = new Big(price);
        const aux = price.div(okex.tickSize[pairID]);
        const aux2 = Math.floor(aux);
        price = new Big(aux2).times(okex.tickSize[pairID]);
        resolve(price.toFixed(okex.pricePrecision[pairID]));
    })
}

const manageInitialOrder = async (pairID, trade) => {
    let executedPrice = new Big(trade.ap);
    let executedQty = new Big(trade.q).times(okex.ctVal[pairID]);
    
    let comission = new Big(trade.n);
    fees = fees.plus(comission);
    operations_status[pairID].partialProfit = new Big(0);
    operations_status[pairID].marketOpTimestamp = null;
    if (operations_status[pairID].moreOrdersQty!=0) {
        let cummu = executedPrice.times(executedQty);
        let cummuOld = operations_status[pairID].moreOrdersPrice.times(operations_status[pairID].moreOrdersQty);
        let totalCummu = cummu.plus(cummuOld);
        executedQty =operations_status[pairID].moreOrdersQty.plus(executedQty);
        executedPrice  = totalCummu.div(executedQty);  
        operations_status[pairID].moreOrders = false;
        operations_status[pairID].moreOrdersPrice = new Big(0);
        operations_status[pairID].moreOrdersQty = new Big(0);
        operations_status[pairID].moreOrdersRemain = new Big(0)
        logger.info("Final acumulado. Cantidad " + executedQty)
    }
    let cummulativeQty = new Big(executedPrice).times(executedQty);
    if (executedPrice != 0 && executedQty!= 0) {
        if (trade.S=="BUY"){
            
            operations_status[pairID].side = "long";
            operations_status[pairID].cummulativeQty = cummulativeQty;
            operations_status[pairID].executedPrice = executedPrice;
            operations_status[pairID].executedQty = executedQty;
            operations_status[pairID].partialQty = executedQty;
            operations_status[pairID].lastExecPrice = executedPrice;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level = 0;
            operations_status[pairID].timesMoving = 0;
            operations_status[pairID].startAmount = cummulativeQty;
            operations_status[pairID].stopLoss = null;
            operations_status[pairID].moving = false;
            operations_status[pairID].movingToPair = null;
            operations_status[pairID].movingChangeSide = false;
            operations_status[pairID].movingLoose = null;
            levelsTimeStamp[pairID]=[];
            realOpsStartAmount = realOpsStartAmount.plus(cummulativeQty);
            // totalCumm = totalCumm.plus(cummulativeQty);
            // if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            // if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            logger.info("Arrancamos long el par:" + okex.pairs[pairID] + " precio: " + executedPrice + " cantidad: " + cummulativeQty);
            logger.info("****************************************************************************");
            openOperations++;
            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
            multAux = multAux.plus(1.01);
            let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
           
            
        } else if (trade.S=="SELL"){
            operations_status[pairID].side = "short";
            operations_status[pairID].cummulativeQty = cummulativeQty;
            operations_status[pairID].executedPrice = executedPrice;
            operations_status[pairID].executedQty = executedQty;
            operations_status[pairID].partialQty = executedQty;
            operations_status[pairID].lastExecPrice = executedPrice;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level = 0;
            operations_status[pairID].startAmount = cummulativeQty;
            operations_status[pairID].stopLoss = null;
            operations_status[pairID].moving = false;
            operations_status[pairID].movingToPair = null;
            operations_status[pairID].movingChangeSide = false;
            operations_status[pairID].movingLoose = null;
            levelsTimeStamp[pairID]=[];
            realOpsStartAmount = realOpsStartAmount.plus(cummulativeQty);
            // totalCumm = totalCumm.plus(cummulativeQty);
            // if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            // if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            logger.info("Arrancamos short el par:" + okex.pairs[pairID] + " precio: " + executedPrice  + " cantidad: " + cummulativeQty);
            logger.info("****************************************************************************");
            openOperations++;
            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
            multAux = new Big(0.99).minus(multAux);
            let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
            
            
        }
    } else {
        logger.error(" "+"Cantidad es cero");
    }
}

const manageInitialOrderMoving = async (pairID, trade) => {
    let executedPrice = new Big(trade.ap);
    let executedQty = new Big(trade.q).times(okex.ctVal[pairID]);
    let comission = new Big(trade.n);
    fees = fees.plus(comission);
    operations_status[pairID].partialProfit = new Big(0);
    operations_status[pairID].marketOpTimestamp = null;
    if (executedPrice != 0 && executedQty!= 0) {
        if (trade.S=="BUY"){
            if (operations_status[pairID].moreOrdersQty!=0) {
                let cummu = executedPrice.times(executedQty);
                let cummuOld = operations_status[pairID].moreOrdersPrice.times(operations_status[pairID].moreOrdersQty);
                let totalCummu = cummu.plus(cummuOld);
                executedQty =operations_status[pairID].moreOrdersQty.plus(executedQty);
                executedPrice  = totalCummu.div(executedQty);  
                operations_status[pairID].moreOrders = false;
                operations_status[pairID].moreOrdersPrice = new Big(0);
                operations_status[pairID].moreOrdersQty = new Big(0);
                operations_status[pairID].moreOrdersRemain = new Big(0)
                logger.info("Final acumulado. Cantidad " + executedQty)

            }
            let execP = executedPrice.div(operations_status[pairID].movingLoose);
            let cummulativeQty = new Big(execP).times(executedQty);
            operations_status[pairID].side = "long";
            operations_status[pairID].cummulativeQty = cummulativeQty;
            operations_status[pairID].executedPrice = execP;
            operations_status[pairID].executedQty = executedQty;
            operations_status[pairID].partialQty = executedQty;
            operations_status[pairID].lastExecPrice = execP;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level = 0;
            operations_status[pairID].startAmount = cummulativeQty;
            operations_status[pairID].stopLoss = null;
            operations_status[pairID].moving = false;
            operations_status[pairID].movingToPair = null;
            operations_status[pairID].movingChangeSide = false;
            operations_status[pairID].movingLoose = null;
            levelsTimeStamp[pairID]=[];
            realOpsStartAmount = realOpsStartAmount.plus(cummulativeQty);
            // totalCumm = totalCumm.plus(cummulativeQty);
            // if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            // if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            logger.info("Tras el moving arrancamos long el par:" + okex.pairs[pairID] + " precio: " + executedPrice + " cantidad: " + cummulativeQty);
            logger.info("****************************************************************************");
            openOperations++;
            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
            multAux = multAux.plus(1.01);
            let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                        
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
           
            
        } 
        if (trade.S=="SELL"){
            if (operations_status[pairID].moreOrdersQty!=0) {
                let cummu = executedPrice.times(executedQty);
                let cummuOld = operations_status[pairID].moreOrdersPrice.times(operations_status[pairID].moreOrdersQty);
                let totalCummu = cummu.plus(cummuOld);
                executedQty =operations_status[pairID].moreOrdersQty.plus(executedQty);
                executedPrice  = totalCummu.div(executedQty);  
                operations_status[pairID].moreOrders = false;
                operations_status[pairID].moreOrdersPrice = new Big(0);
                operations_status[pairID].moreOrdersQty = new Big(0);
                operations_status[pairID].moreOrdersRemain = new Big(0)
                logger.info("Final acumulado. Cantidad " + executedQty)

            }
            let execP = executedPrice.div(operations_status[pairID].movingLoose);
            let cummulativeQty = new Big(execP).times(executedQty);
            operations_status[pairID].side = "short";
            operations_status[pairID].cummulativeQty = cummulativeQty;
            operations_status[pairID].executedPrice = execP;
            operations_status[pairID].executedQty = executedQty;
            operations_status[pairID].partialQty = executedQty;
            operations_status[pairID].lastExecPrice = execP;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level = 0;
            operations_status[pairID].startAmount = cummulativeQty;
            operations_status[pairID].stopLoss = null;
            operations_status[pairID].moving = false;
            operations_status[pairID].movingToPair = null;
            operations_status[pairID].movingChangeSide = false;
            operations_status[pairID].movingLoose = null;
            levelsTimeStamp[pairID]=[];
            realOpsStartAmount = realOpsStartAmount.plus(cummulativeQty);
            // totalCumm = totalCumm.plus(cummulativeQty);
            // if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            // if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            logger.info("Tras el moving arrancamos short el par:" + okex.pairs[pairID] + " precio: " + executedPrice + " cantidad: " + cummulativeQty);
            logger.info("****************************************************************************");
            openOperations++;
            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
            multAux = new Big(0.99).minus(multAux);
            let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                        
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
           
            
        }
        logger.info("Guardando info en la nevera")
        fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
            if (err) {
                error = true;
            }
        });
        fs.writeFile('./fridge.json', JSON.stringify(operations_status_pause), err => {
            if (err) {
                error = true;
            }
            });
              
        
    } else {
        logger.error(" "+"Cantidad es cero");
    }
}

const manageNextInitialOrder = async (pairID, trade) => {
    logger.info("Gestionamos orden de apertura y procedemos a poner la siguiente")
    let executedPrice = new Big(trade.ap);
    let executedQty = new Big(trade.q).times(okex.ctVal[pairID]);
    let profit = new Big(trade.rp);
    let cummu = executedPrice.times(executedQty);
    let cummuOld = operations_status[pairID].moreOrdersPrice.times(operations_status[pairID].moreOrdersQty);
    let totalCummu = cummu.plus(cummuOld);
    logger.info("Cantidad " + executedQty + " precio " + executedPrice);

    operations_status[pairID].moreOrdersQty=operations_status[pairID].moreOrdersQty.plus(executedQty);
    operations_status[pairID].moreOrdersPrice = totalCummu.div(operations_status[pairID].moreOrdersQty);
    logger.info("Acumulado, cantidad " +  operations_status[pairID].moreOrdersQty + " precio " +  operations_status[pairID].moreOrdersPrice)

    if (operations_status[pairID].side=="long") anotherOrder(pairID,"buy","market", operations_status[pairID].moreOrdersRemain, 0, "long");
    if (operations_status[pairID].side=="short") anotherOrder(pairID,"sell","market", operations_status[pairID].moreOrdersRemain, 0, "short");
}

const manageLevelingOrder = async (pairID, trade) => {
    let executedPrice = new Big(trade.ap);
    let executedQty = new Big(trade.q).times(okex.ctVal[pairID]);
    let cummulativeQty = new Big(executedPrice).times(executedQty)/*.times(okex.ctVal[pairID])*/;
    let comission = new Big(trade.n);
    fees = fees.plus(comission);
    operations_status[pairID].marketOpTimestamp = null;
    if (executedPrice != 0 && executedQty!= 0) {
        levelsTimeStamp[pairID].push(Date.now())
        operations_status[pairID].lastTry = null;
        operations_status[pairID].takeProfit = false;
        if (operations_status[pairID].moreOrdersQty!=0) {
            let cummu = executedPrice.times(executedQty);
            let cummuOld = operations_status[pairID].moreOrdersPrice.times(operations_status[pairID].moreOrdersQty);
            let totalCummu = cummu.plus(cummuOld);
            cummulativeQty = totalCummu;
            executedQty = operations_status[pairID].moreOrdersQty.plus(executedQty);
            executedPrice  = totalCummu.div(executedQty);  
            operations_status[pairID].moreOrders = false;
            operations_status[pairID].moreOrdersPrice = new Big(0);
            operations_status[pairID].moreOrdersQty = new Big(0);
            operations_status[pairID].moreOrdersRemain = new Big(0)
            logger.info("Final acumulado. Cantidad " + executedQty)
        }
        if (trade.S=="BUY"){
            let totalQty = executedQty.plus(operations_status[pairID].executedQty);
            let totalCummlativeQty = cummulativeQty.plus(operations_status[pairID].cummulativeQty);
            let execprice = totalCummlativeQty.div(totalQty);
            operations_status[pairID].cummulativeQty = totalCummlativeQty;
            operations_status[pairID].executedPrice = execprice;
            operations_status[pairID].executedQty = totalQty;
            operations_status[pairID].partialQty = totalQty;
            operations_status[pairID].lastExecPrice = executedPrice;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level++;
            // totalCumm = totalCumm.plus(cummulativeQty);
            // if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            // if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;

            let sell = operations_status[pairID].closeValue.times(operations_status[pairID].executedQty);
            let comission = sell.times(0.0004);
            let pnlAux =sell.minus(operations_status[pairID].cummulativeQty.plus(comission));
            let diff = pnlAux.minus(operations_status[pairID].pnl);
            operations_status[pairID].pnl = pnlAux;
            pnl = pnl.plus(diff);
            
            //if (totalCummlativeQty.gte(50000)) percentBenefit = 1.002  
            logger.info("Ampliamos long el par:" + okex.pairs[pairID] + " Precio: " + executedPrice + " Cantidad Total: " + totalCummlativeQty);
            logger.info("****************************************************************************");
            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
            multAux = multAux.plus(1.01);
                let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        let pair = okex.pairs[pairID];
                        let sobrante = 0
                        let qty = operations_status[pairID].executedQty;
                        // while (qty>0){
                        //     if (qty>okex.maxQty[pairID]) {
                        //         sobrante = qty-okex.maxQty[pairID];
                        //         qty = new Big(okex.maxQty[pairID])
                        //     }
                            okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, qty.div(okex.ctVal[pairID]))
                                .then(answer => {
                                    if (answer=="error"){
                                        operations_status[pairID].state="noClosingOrder";
                                    } else {
                                        operations_status[pairID].state="none";
                                        operations_status[pairID].orderId= answer;
                                    }
                                })
                            qty = sobrante;
                        // }
                        
                    })
            
            
        } else if (trade.S=="SELL"){
            let totalQty = executedQty.plus(operations_status[pairID].executedQty);
            let totalCummlativeQty = cummulativeQty.plus(operations_status[pairID].cummulativeQty);
            let execprice = totalCummlativeQty.div(totalQty);
            operations_status[pairID].cummulativeQty = totalCummlativeQty;
            operations_status[pairID].executedPrice = execprice;
            operations_status[pairID].executedQty = totalQty;
            operations_status[pairID].partialQty = totalQty;
            operations_status[pairID].lastExecPrice = executedPrice;
            operations_status[pairID].lastExecTime = Date.now();
            operations_status[pairID].level++;
            // totalCumm = totalCumm.plus(cummulativeQty);
            // if (!investLimitReached && totalCumm.gt(limitInvestment)) investLimitReached = true;
            // if (totalCumm.gt(maxInversion)) maxInversion=totalCumm;
            let buy = operations_status[pairID].closeValue.times(operations_status[pairID].executedQty);
            let comission = buy.times(0.0004);
            let pnlAux =operations_status[pairID].cummulativeQty.minus(buy.plus(comission));
            let diff = pnlAux.minus(operations_status[pairID].pnl);
            operations_status[pairID].pnl = pnlAux;
            pnl = pnl.plus(diff);
            //if (totalCummlativeQty.gte(50000)) percentBenefit = 0.998  
            logger.info("Ampliamos short el par:" + okex.pairs[pairID] + " Precio: " + executedPrice + " Cantidad Total: " + totalCummlativeQty);
            logger.info("****************************************************************************");
            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
            multAux = new Big(0.99).minus(multAux);
                let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        let pair = okex.pairs[pairID];
                        let sobrante = 0
                        let qty = operations_status[pairID].executedQty;
                        // while (qty>0){
                        //     if (qty>okex.maxQty[pairID]) {
                        //         sobrante = qty-okex.maxQty[pairID];
                        //         qty = okex.maxQty[pairID]
                        //     }
                            okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, qty.div(okex.ctVal[pairID]))
                                .then(answer => {
                                    if (answer=="error"){
                                        operations_status[pairID].state="noClosingOrder";
                                    } else {
                                        operations_status[pairID].state="none";
                                        operations_status[pairID].orderId= answer;
                                    }
                                }) 
                            qty = sobrante;
                        // }
                    })
            
            
        }
       
        logger.info("Guardando info en la nevera")
        fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
            if (err) {
                error = true;
            }
        });
        fs.writeFile('./fridge.json', JSON.stringify(operations_status_pause), err => {
            if (err) {
                error = true;
            }
            });
            operations_status[pairID].needToSaveInfo = false;
        
    } else {
        logger.error("Trade de leveling sin cantidad o precio");
    }
}

const manageNextLevelingOrder = async (pairID, trade) => {
    logger.info("Gestionamos orden de leveling y procedemos a poner la siguiente")
    let executedPrice = new Big(trade.ap);
    let executedQty = new Big(trade.q).times(okex.ctVal[pairID]);
    let profit = new Big(trade.rp);
    let cummu = executedPrice.times(executedQty);
    let cummuOld = operations_status[pairID].moreOrdersPrice.times(operations_status[pairID].moreOrdersQty);
    let totalCummu = cummu.plus(cummuOld);
    logger.info("Cantidad " + executedQty + " precio " + executedPrice);
    operations_status[pairID].moreOrdersQty=operations_status[pairID].moreOrdersQty.plus(executedQty);
    operations_status[pairID].moreOrdersPrice = totalCummu.div(operations_status[pairID].moreOrdersQty);
    logger.info("Acumulado, cantidad " +  operations_status[pairID].moreOrdersQty + " precio " +  operations_status[pairID].moreOrdersPrice)
    if (operations_status[pairID].side=="long") anotherOrder(pairID,"buy","market", operations_status[pairID].moreOrdersRemain, 0, "long");
    if (operations_status[pairID].side=="short") anotherOrder(pairID,"sell","market", operations_status[pairID].moreOrdersRemain, 0, "short");
}

const manageClosingOrder = async (pairID, trade) => {
    let executedPrice = new Big(trade.ap);
    let executedQty = new Big(trade.q).times(okex.ctVal[pairID]);
    let comission = new Big(trade.n);
    fees = fees.plus(comission);
    let cummClose = 0;
    let movingPairId = null;
    let loose = 0;
    let movingToSide = null;
    if (executedPrice != 0 && executedQty!= 0) {
        let profit = new Big(trade.rp);
        // operations_status[pairID].partialProfit = operations_status[pairID].partialProfit.plus(profit);
        // profit = operations_status[pairID].partialProfit;
        if (operations_status[pairID].moreOrdersQty!=0) {
            let cummu = executedPrice.times(executedQty);
            let cummuOld = operations_status[pairID].moreOrdersPrice.times(operations_status[pairID].moreOrdersQty);
            let totalCummu = cummu.plus(cummuOld);
            executedQty = operations_status[pairID].moreOrdersQty.plus(executedQty);
            executedPrice  = totalCummu.div(executedQty);  
            operations_status[pairID].moreOrders = false;
            operations_status[pairID].moreOrdersPrice = new Big(0);
            operations_status[pairID].moreOrdersQty = new Big(0);
            operations_status[pairID].moreOrdersRemain = new Big(0)
        }
        closedProfit = closedProfit.plus(profit);
        totalProfitit = totalProfitit.plus(profit);
        pnl = pnl.minus(operations_status[pairID].pnl);
        operations_status[pairID].pnl=0;
        totalCerrado = totalCerrado.plus(operations_status[pairID].cummulativeQty);
        operations_status[pairID].orderId = null;
        operations_status[pairID].profit = operations_status[pairID].profit.plus(profit);
        logger.info("Cerramos el par:" + okex.pairs[pairID] + " Profit: " + profit + " acumulado: " + operations_status[pairID].profit);
        logger.info("Profit total: " + totalProfitit.plus(fees));
        logger.info("****************************************************************************");
        operations_status[pairID].partialProfit = new Big(0);
        realOpsStartAmount = realOpsStartAmount.minus(operations_status[pairID].startAmount);
        operations_status[pairID].lastTry = null;
        operations_status[pairID].stopLoss = null;
        operations_status[pairID].takeProfit = false;
        // totalCumm = totalCumm.minus(operations_status[pairID].realCummulativeQty);
        // operations_status[pairID].realCummulativeQty = new Big(0);
        if (investLimitReached && totalCumm.lt(limitInvestment)) investLimitReached = false;
        moneyNeededByRealOps = moneyNeededByRealOps.minus(operations_status[pairID].moneyNeeded);
        operations_status[pairID].moneyNeeded = new Big(0);
        if (operations_status[pairID].moving){
            operations_status[pairID].timesMoving = operations_status[pairID].timesMoving+1;
            cummClose = executedPrice.times(executedQty);
            loose = executedPrice.div(operations_status[pairID].executedPrice);
            logger.info("Datos para la nueva operacion. Total: "+ cummClose + " loose: " + loose);
            if (operations_status[pairID].movingToPair=="limbo"){
                let limboInfo = {
                    "id": Date.now(),
                    "fromPair" : okex.pairs[pairID],
                    "cummClose" : cummClose,
                    "loose" : loose,
                    "closePrice" : executedPrice,
                    "originalSide" : operations_status[pairID].side,
                    "timesMoving" : operations_status[pairID].timesMoving
                }
                limbo.push(limboInfo);
                operations_status[pairID].moving = false;
                operations_status[pairID].movingToPair = null;
                operations_status[pairID].movingChangeSide = false;
                operations_status[pairID].movingLoose = null;
                operations_status[pairID].timesMoving = 0;
                fs.writeFile('./limbo.json', JSON.stringify(limbo), err => {
                    if (err) {
                        error = true;
                    }
                });
            } else {
                movingPairId = operations_status[pairID].movingToPair;
                if (operations_status[pairID].movingChangeSide) loose= new Big(1).div(loose);
                operations_status[movingPairId].movingLoose= loose;
                operations_status[movingPairId].timesMoving= operations_status[pairID].timesMoving;
                if ((!operations_status[pairID].movingChangeSide && operations_status[pairID].side=="long") || (operations_status[pairID].movingChangeSide && operations_status[pairID].side=="short")) movingToSide="long";
                if ((!operations_status[pairID].movingChangeSide && operations_status[pairID].side=="short") || (operations_status[pairID].movingChangeSide && operations_status[pairID].side=="long")) movingToSide="short";
            }   
            
        }
        if (operations_status_pause[pairID]!=null) {
            logger.info("Recuperamos operación de la nevera. Cantidad: " + operations_status_pause[pairID].cummulativeQty)
            operations_status[pairID].executedPrice=new Big(operations_status_pause[pairID].execPrice);
            operations_status[pairID].executedQty=new Big(operations_status_pause[pairID].executedQty);
            operations_status[pairID].cummulativeQty=new Big(operations_status_pause[pairID].cummulativeQty);
            operations_status[pairID].lastExecPrice=new Big(operations_status_pause[pairID].lastExecPrice);
            operations_status[pairID].partialProfit=new Big(0);
            operations_status_pause[pairID] = null;
            operations_status[pairID].isMoreOnFridger = false;
            operations_status[pairID].comesFromFridger = true;
            moneyInFridger = moneyInFridger.minus(operations_status[pairID].cummulativeQty);
            //if (operations_status[pairID].timesDivideAndConquer==0) operations_status[pairID].earlyEntry=true;
            if (operations_status[pairID].timesDivideAndConquer>0) operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer-1;
            fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
                if (err) {
                    error = true;
                }
              });
            fs.writeFile('./fridge.json', JSON.stringify(operations_status_pause), err => {
                if (err) {
                    error = true;
                }
              });
            let pair = okex.pairs[pairID];
            if (operations_status[pairID].side == "long") {
                //await okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId);
                let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                multAux = multAux.plus(1.01);
                let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    logger.info("problemas al poner orden de cierre");
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    logger.info("Puesta orden de cierre");
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
            } else if (operations_status[pairID].side == "short") {
                //await okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId);
                let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                multAux = new Big(0.99).minus(multAux);
                let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    logger.info("problemas al poner orden de cierre");
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    logger.info("Puesta orden de cierre");
                                    operations_status[pairID].orderId= answer;
                                }
                            }) 
                    })
            }
            if (cummClose!=0 && movingPairId!=null && movingToSide!=null && loose!=0 && movingPairId!=pairID) {
                operations_status[movingPairId].movingLoose= loose;
                if (movingToSide=="long") startPositionMoving(movingPairId,"long",cummClose);
                if (movingToSide=="short") startPositionMoving(movingPairId,"short",cummClose);
                operations_status[pairID].moving = false;
                operations_status[pairID].movingToPair = null;
                operations_status[pairID].movingChangeSide = false;
                if (movingPairId!=pairID) {
                    operations_status[pairID].movingLoose = null;
                    operations_status[pairID].timesMoving = 0;
                }
            }

        } else {
            if (operations_status[pairID].side=="long") {
                numOpsLong--;
            }
            else {
                numOpsShort--;  
            }
            openOperations--;
            
            if (limitingops && !operations_status[pairID].limitOperations) selectPairsToOperate();
            operations_status[pairID].side="none";
            operations_status[pairID].state="none";
            operations_status[pairID].startAmount = new Big(0);
            operations_status[pairID].cummulativeQty = new Big(0);
            operations_status[pairID].executedQty = new Big(0);
            operations_status[pairID].partialProfit = new Big(0);
            operations_status[pairID].isMoreOnFridger = false;
            operations_status[pairID].comesFromFridger = false;
            levelsTimeStamp[pairID]=[];
            operations_status[pairID].timesDivideAndConquer = 0;
            if (operations_status[pairID].leverage!=10 && movingPairId!=pairID) {
                okex.changeLeverage(okex.instId[pairID],10)
                    .then(answer => {
                        logger.info(JSON.stringify(answer,null,2));
                        if (answer=="error") {
                            logger.info("Error al cambiar el apalancamiento");
                        } else {
                            operations_status[pairID].leverage= 10;
                            logger.info("Volvemos a apalancamiento 10 para el par " +  okex.pairs[pairID])
                        }
                    })
            }
            if (cummClose!=0 && movingPairId!=null && movingToSide!=null && loose!=0) {
                operations_status[movingPairId].movingLoose= loose;
                if (movingToSide=="long") startPositionMoving(movingPairId,"long",cummClose);
                if (movingToSide=="short") startPositionMoving(movingPairId,"short",cummClose);
                operations_status[pairID].moving = false;
                operations_status[pairID].movingToPair = null;
                operations_status[pairID].movingChangeSide = false;
                if (movingPairId!=pairID) {
                    operations_status[pairID].movingLoose = null;
                    operations_status[pairID].timesMoving = 0;
                }
            }
        }   
    } else {
        logger.error("Trade de venta sin cantidad o precio");
    }
}

const manageNextClosingOrder = async (pairID, trade) => {
    let executedPrice = new Big(trade.ap);
    let executedQty = new Big(trade.q).times(okex.ctVal[pairID]);
    let profit = new Big(trade.rp);
    closedProfit = closedProfit.plus(profit);
    totalProfitit = totalProfitit.plus(profit);
    let cummu = executedPrice.times(executedQty);
    let cummuOld = operations_status[pairID].moreOrdersPrice.times(operations_status[pairID].moreOrdersQty);
    let totalCummu = cummu.plus(cummuOld);
    logger.info("Cantidad " + executedQty + " precio " + executedPrice);

    operations_status[pairID].moreOrdersQty=operations_status[pairID].moreOrdersQty.plus(executedQty);
    operations_status[pairID].moreOrdersPrice = totalCummu.div(operations_status[pairID].moreOrdersQty);
    logger.info("Acumulado, cantidad " +  operations_status[pairID].moreOrdersQty + " precio " +  operations_status[pairID].moreOrdersPrice)

    if (operations_status[pairID].side=="long") anotherOrder(pairID,"sell","market", operations_status[pairID].moreOrdersRemain, 0, "long");
    if (operations_status[pairID].side=="short") anotherOrder(pairID,"buy","market", operations_status[pairID].moreOrdersRemain, 0, "short");
}

const manageClosingPartialOrder = async (pairID, trade) => {
    //logger.info(JSON.stringify(trade,null,2));
    let executedPrice = new Big(trade.L);
    let executedQty = new Big(trade.l).times(okex.ctVal[pairID]);
    let comission = new Big(trade.n);
    let profit = new Big(trade.rp);
    fees = fees.plus(comission);
    if (executedPrice != 0 && executedQty!= 0) {
        operations_status[pairID].closeValue = executedPrice;
        if ((trade.S=="BUY" && operations_status[pairID].side=="short") || (trade.S=="SELL" && operations_status[pairID].side=="long")){
            logger.info("****************************************************************************");
            logger.info("Venta parcial del par " + okex.pairs[pairID] + " Cantidad " + executedQty);
            logger.info("****************************************************************************");
            let closedCumm = executedQty.times(operations_status[pairID].executedPrice);
            //totalCumm = totalCumm.minus(closedCumm);
            operations_status[pairID].cummulativeQty = operations_status[pairID].cummulativeQty.minus(closedCumm);
            operations_status[pairID].executedQty = operations_status[pairID].executedQty.minus(executedQty);
            operations_status[pairID].partialProfit = operations_status[pairID].partialProfit.plus(profit);
            if (operations_status[pairID].side=="long") {
                let sell = operations_status[pairID].closeValue.times(operations_status[pairID].executedQty);
                let comission = sell.times(0.0004);
                let pnlAux =sell.minus(operations_status[pairID].cummulativeQty.plus(comission));
                let diff = pnlAux.minus(operations_status[pairID].pnl);
                operations_status[pairID].pnl = pnlAux;
                pnl = pnl.plus(diff);
            } else if (operations_status[pairID].side=="short") {
                let buy = operations_status[pairID].closeValue.times(operations_status[pairID].executedQty);
                let comission = buy.times(0.0004);
                let pnlAux =operations_status[pairID].cummulativeQty.minus(buy.plus(comission));
                let diff = pnlAux.minus(operations_status[pairID].pnl);
                operations_status[pairID].pnl = pnlAux;
                pnl = pnl.plus(diff);
            }
        } else {
            logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            logger.error("!!!!!!!!!!!!!!!!No se de donde sale esta orden parcial!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        }
    } else {
        logger.error("Trade de cierre parcial sin cantidad o precio");
    }
}

const manageUnknownOrder = async (pairID,trade) => {
    if (stop) {
        if ((trade.S=="BUY" && operations_status[pairID].side=="short" && !operations_status[pairID].moreOrders) || (trade.S=="SELL" && operations_status[pairID].side=="long" && !operations_status[pairID].moreOrders)){
            manageClosingOrder(pairID,trade);
        } else if ((trade.S=="BUY" && operations_status[pairID].side=="short" && operations_status[pairID].moreOrders) || (trade.S=="SELL" && operations_status[pairID].side=="long" && operations_status[pairID].moreOrders)) {
            manageClosingPartialOrder(pairID,trade);
        }else {
            logger.error("/*-/*-/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/")
            logger.error("Ha llegado un trade que no identificamos del par " + okex.pairs[pairID])
            logger.error(JSON.stringify(trade,null,2));
            logger.error("/*-/*-/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/") 
        }
    } else {
        logger.error("/*-/*-/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/")
        logger.error("Ha llegado un trade que no identificamos del par " + okex.pairs[pairID])
        logger.error(JSON.stringify(trade,null,2));
        logger.error("/*-/*-/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/")
    }
        
}

const manageUnknownPartialOrder = async (pairID,trade) => {
    if (stop) {
        if ((trade.S=="BUY" && operations_status[pairID].side=="short") || (trade.S=="SELL" && operations_status[pairID].side=="long")){
            manageClosingPartialOrder(pairID,trade);
        } else {
            logger.error("/*-/*-/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/")
            logger.error("Ha llegado un trade parcial que no identificamos del par " + okex.pairs[pairID])
            logger.error(JSON.stringify(trade,null,2));
            logger.error("/*-/*-/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/") 
        }
    } else {
        logger.error("/*-/*-/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/")
        logger.error("Ha llegado un trade parcial que no identificamos del par " + okex.pairs[pairID])
        logger.error(JSON.stringify(trade,null,2));
        logger.error("/*-/*-/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/-*/")
    }
        
}

const manageSurplusOrder = async (pairID, trade) => {
    let comission = new Big(trade.n);
    fees = fees.plus(comission);
    let profit = new Big(0);
    operations_status[pairID].state="checkSurplus";
}

const manageOtherPartialOrder = async (pairID, trade) => {
    let comission = new Big(trade.n);
    fees = fees.plus(comission);
}

const manageCloseOrderMissing = async (pairID, closeValue) => {
    let actualTime = Date.now();
    if(operations_status[pairID].missingCloserOrderLastTryTimestamp==null || (actualTime-operations_status[pairID].missingCloserOrderLastTryTimestamp)>150000){
        if (operations_status[pairID].side=="long") {
            if (operations_status[pairID].orderId!=null){
                let cancelAnswer = await okex.cancelOrder(okex.instId,operations_status[pairID].orderId);
            }
            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
            multAux = multAux.plus(1.01);
            let closePrice = operations_status[pairID].executedPrice.times(multAux);
            checkPrice(closePrice,pairID)
                .then(closePrice => {
                   
                    okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                        .then(answer => {
                            if (answer=="error"){
                                operations_status[pairID].missingCloserOrderLastTryTimestamp=Date.now();
                                operations_status[pairID].state="noClosingOrder";
                            } else {
                                operations_status[pairID].state="none";
                                operations_status[pairID].orderId=answer;
                            }
                    })
                })
            
    
        } else if (operations_status[pairID].side=="short") {
            if (operations_status[pairID].orderId!=null){
                let cancelAnswer = await okex.cancelOrder(okex.instId,operations_status[pairID].orderId);
            }
            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
            multAux = new Big(0.99).minus(multAux);
            let closePrice = operations_status[pairID].executedPrice.times(multAux);
            checkPrice(closePrice,pairID)
                .then(closePrice => {
                    
                    okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                        .then(answer => {
                            if (answer=="error"){
                                operations_status[pairID].missingCloserOrderLastTryTimestamp=Date.now();
                                operations_status[pairID].state="noClosingOrder";
                            } else {
                                operations_status[pairID].state="none";
                                operations_status[pairID].orderId=answer;
                            }
                    })
                })           
    
        }
    }
   
}

const manageClosingProblem = (pairID) => {
    if (operations_status[pairID].side=="long") {
        operations_status[pairID].state="closing";
        okex.placeOrder(okex.instId[pairID], "market", "sell", "long", 0, operations_status[pairID].executedQty)
            .then(answer => {
                if (answer=="error" || answer.code==null || answer.code!="0") operations_status[pairID].state="closingProblem";
            })
    
        

    } else if (operations_status[pairID].side=="short") {
        operations_status[pairID].state="closing";
        okex.placeOrder(okex.instId[pairID], "market", "buy", "short", 0, operations_status[pairID].executedQty)
            .then(answer => {
                if (answer=="error" || answer.code==null || answer.code!="0") operations_status[pairID].state="closingProblem";
            })
    

    }
}

const divideAndConquer = async (pairID) => {
    logger.info("Entramos en divide y venceras para el par " + okex.pairs[pairID])
    let newQty = operations_status[pairID].executedQty.times(divideAndConquerValue);
    newQty = await checkPairStep(newQty, pairID);
    newQty = new Big(newQty).times(okex.ctVal[pairID]);
    let spareQty = operations_status[pairID].executedQty.minus(newQty);
    let newCumm = newQty.times(operations_status[pairID].executedPrice);
    let spareCumm = spareQty.times(operations_status[pairID].executedPrice);
    //let spareExec = spareCumm.div(spareQty);
    if (operations_status_pause[pairID]==null) {
        let spare = {
            "simbol" : okex.pairs[pairID],
            "execPrice" : operations_status[pairID].executedPrice,
            "executedQty" : spareQty,
            "cummulativeQty" : spareCumm,
            "lastExecPrice" : operations_status[pairID].executedPrice
        }
        operations_status_pause[pairID] = spare;
        operations_status[pairID].executedQty = newQty;
        operations_status[pairID].cummulativeQty = newCumm;
        logger.info("Nueva cantidad para operar: " + newQty + " En Dolares: " + newCumm +  " dejamos en la nevera: " + spareCumm);
        operations_status[pairID].isMoreOnFridger = true;
        operations_status[pairID].needToSaveInfo = true;
        operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer+1;
        moneyInFridger = moneyInFridger.plus(spareCumm);
        levelPosition(pairID, false);
    } else {
        logger.info("Dividimos lo ya dividido.")
        operations_status_pause[pairID].executedQty = operations_status_pause[pairID].executedQty.plus(spareQty);
        operations_status_pause[pairID].cummulativeQty = operations_status_pause[pairID].cummulativeQty.plus(spareCumm);
        operations_status_pause[pairID].execPrice = operations_status_pause[pairID].cummulativeQty.div(operations_status_pause[pairID].executedQty);
        operations_status_pause[pairID].lastExecPrice = operations_status_pause[pairID].execPrice;
        operations_status[pairID].executedQty = newQty;
        operations_status[pairID].cummulativeQty = newCumm;
        logger.info("Nueva cantidad para operar: " + newQty + " En Dolares: " + newCumm +  " dejamos en la nevera: " + spareCumm);
        operations_status[pairID].isMoreOnFridger = true;
        operations_status[pairID].needToSaveInfo = true;
        operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer+1;
        moneyInFridger = moneyInFridger.plus(spareCumm);
        levelPosition(pairID, false);
    }

}

const divideAndConquerManually = async (pairID, cummQty, isEarlyEntry) => {
    logger.info("Entramos en divide y venceras para el par " + okex.pairs[pairID])
    let divideAndConquerValueAux = operations_status[pairID].cummulativeQty.div(cummQty)
    let newQty = operations_status[pairID].executedQty.div(divideAndConquerValueAux);
    if (!test){
        newQty = await checkPairStep(newQty, pairID);
        newQty = new Big(newQty).times(okex.ctVal[pairID]);
    }
    let spareQty = new Big(operations_status[pairID].executedQty).minus(newQty);
    let newCumm = newQty.times(operations_status[pairID].executedPrice);
    let spareCumm = spareQty.times(operations_status[pairID].executedPrice);
    //let spareExec = spareCumm/(spareQty);
    if (operations_status_pause[pairID]==null) {
        let spare = {
            "simbol" : okex.pairs[pairID],
            "execPrice" : operations_status[pairID].executedPrice,
            "executedQty" : new Big(spareQty),
            "cummulativeQty" : spareCumm,
            "lastExecPrice" : operations_status[pairID].executedPrice
        }
        operations_status_pause[pairID] = spare;
        operations_status[pairID].executedQty = newQty;
        operations_status[pairID].cummulativeQty = newCumm;
        logger.info("Nueva cantidad para operar: " + newQty + " En Dolares: " + newCumm +  " dejamos en la nevera: " + spareCumm);
        operations_status[pairID].isMoreOnFridger = true;
        operations_status[pairID].needToSaveInfo = true;
        operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer+1;
        moneyInFridger = moneyInFridger.plus(spareCumm);
        levelPosition(pairID, true);
    } else {
        logger.info("Dividimos lo ya dividido.")
        operations_status_pause[pairID].executedQty = operations_status_pause[pairID].executedQty.plus(spareQty);
        operations_status_pause[pairID].cummulativeQty = operations_status_pause[pairID].cummulativeQty.plus(spareCumm);
        operations_status_pause[pairID].execPrice = operations_status_pause[pairID].cummulativeQty.div(operations_status_pause[pairID].executedQty);
        operations_status_pause[pairID].lastExecPrice = operations_status_pause[pairID].execPrice;
        operations_status[pairID].executedQty = newQty;
        operations_status[pairID].cummulativeQty = newCumm;
        logger.info("Nueva cantidad para operar: " + newQty + " En Dolares: " + newCumm +  " dejamos en la nevera: " + spareCumm);
        operations_status[pairID].isMoreOnFridger = true;
        operations_status[pairID].needToSaveInfo = true;
        operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer+1;
        moneyInFridger = moneyInFridger.plus(spareCumm);
        levelPosition(pairID, true);
    }

}

const moveToFrigde = async (pairID, cummQty) => {
    logger.info("Entramos a mandar a la nevera " + okex.pairs[pairID])
    let divideAndConquerValueAux = operations_status[pairID].cummulativeQty.div(cummQty)
    let newQty = operations_status[pairID].executedQty.div(divideAndConquerValueAux);
    newQty = await checkPairStep(newQty, pairID);
    newQty = new Big(newQty).times(okex.ctVal[pairID]);
    let spareQty = new Big(operations_status[pairID].executedQty).minus(newQty);
    let newCumm = newQty.times(operations_status[pairID].executedPrice);
    let spareCumm = spareQty.times(operations_status[pairID].executedPrice);
    //let spareExec = spareCumm/(spareQty);
    if (operations_status_pause[pairID]==null) {
        let spare = {
            "simbol" : okex.pairs[pairID],
            "execPrice" : operations_status[pairID].executedPrice,
            "executedQty" : new Big(spareQty),
            "cummulativeQty" : spareCumm,
            "lastExecPrice" : operations_status[pairID].executedPrice
        }
        operations_status_pause[pairID] = spare;
        operations_status[pairID].executedQty = newQty;
        operations_status[pairID].cummulativeQty = newCumm;
        logger.info("Nueva cantidad para operar: " + newQty + " En Dolares: " + newCumm +  " dejamos en la nevera: " + spareCumm);
        operations_status[pairID].isMoreOnFridger = true;
        operations_status[pairID].needToSaveInfo = true;
        operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer+1;
        moneyInFridger = moneyInFridger.plus(spareCumm);    
    } else {
        logger.info("Dividimos lo ya dividido.")
        operations_status_pause[pairID].executedQty = operations_status_pause[pairID].executedQty.plus(spareQty);
        operations_status_pause[pairID].cummulativeQty = operations_status_pause[pairID].cummulativeQty.plus(spareCumm);
        operations_status_pause[pairID].execPrice = operations_status_pause[pairID].cummulativeQty.div(operations_status_pause[pairID].executedQty);
        operations_status_pause[pairID].lastExecPrice = operations_status_pause[pairID].execPrice;
        operations_status[pairID].executedQty = newQty;
        operations_status[pairID].cummulativeQty = newCumm;
        logger.info("Nueva cantidad para operar: " + newQty + " En Dolares: " + newCumm +  " dejamos en la nevera: " + spareCumm);
        operations_status[pairID].isMoreOnFridger = true;
        operations_status[pairID].needToSaveInfo = true;
        operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer+1;
        moneyInFridger = moneyInFridger.plus(spareCumm);
    }
    if (operations_status[pairID].side=="long") {
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(cancelAnswer => {
            if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                multAux = multAux.plus(1.01);
                let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        let qty = operations_status[pairID].executedQty;
                        okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, qty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
            } else {
                logger.info("Error al cancelar la orden abierta");
            }
        })
    } else if (operations_status[pairID].side=="short"){
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(cancelAnswer => {
            if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                multAux = new Big(0.99).minus(multAux);
                let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        let qty = operations_status[pairID].executedQty;
                        okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, qty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
            } else {
                logger.info("Error al cancelar la orden abierta");
            }
        })
    }
    
    fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
        if (err) {
            error = true;
        }
    });
    fs.writeFile('./fridge.json', JSON.stringify(operations_status_pause), err => {
        if (err) {
            error = true;
        }
      });
    operations_status[pairID].needToSaveInfo = false;

}

const removeFromFrigde = async (pairID) => {
    logger.info("Sacamos de la nevera " + okex.pairs[pairID])

    operations_status[pairID].executedQty = operations_status_pause[pairID].executedQty.plus(operations_status[pairID].executedQty);
    operations_status[pairID].cummulativeQty = operations_status_pause[pairID].cummulativeQty.plus(operations_status[pairID].cummulativeQty);
    operations_status[pairID].executedPrice = operations_status[pairID].cummulativeQty.div(operations_status[pairID].executedQty);
    operations_status_pause[pairID].lastExecPrice = operations_status_pause[pairID].execPrice;

   
    operations_status[pairID].isMoreOnFridger = false;
    operations_status[pairID].needToSaveInfo = false;
    operations_status[pairID].timesDivideAndConquer = operations_status[pairID].timesDivideAndConquer-1;
    moneyInFridger = moneyInFridger.minus(operations_status_pause[pairID].cummulativeQty);
    operations_status_pause[pairID]=null;
    operations_status[pairID].comesFromFridger = true;
    if (operations_status[pairID].side=="long") {
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(cancelAnswer => {
            if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                multAux = multAux.plus(1.01);
                let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        let qty = operations_status[pairID].executedQty;
                        okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, qty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
            } else {
                logger.info("Error al cancelar la orden abierta");
            }
        })
    } else if (operations_status[pairID].side=="short"){
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(cancelAnswer => {
            if (cancelAnswer!="error" && cancelAnswer.code!=null && cancelAnswer.code=="0") {
                let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                 multAux = new Big(0.99).minus(multAux);
                let closePrice = operations_status[pairID].executedPrice.times(multAux);
                checkPrice(closePrice,pairID)
                    .then(closePrice => {
                        let qty = operations_status[pairID].executedQty;
                        okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, qty.div(okex.ctVal[pairID]))
                            .then(answer => {
                                if (answer=="error"){
                                    operations_status[pairID].state="noClosingOrder";
                                } else {
                                    operations_status[pairID].state="none";
                                    operations_status[pairID].orderId= answer;
                                }
                            })
                    })
            } else {
                logger.info("Error al cancelar la orden abierta");
            }
        })
    }
    
    fs.writeFile('./operations.json', JSON.stringify(operations_status), err => {
        if (err) {
            error = true;
        }
    });
    fs.writeFile('./fridge.json', JSON.stringify(operations_status_pause), err => {
        if (err) {
            error = true;
        }
      });
    operations_status[pairID].needToSaveInfo = false;

}

const changeOpToOtherPair = async (pairID,finalPairID,changeSide) => {
  
    operations_status[pairID].movingToPair = finalPairID;
    operations_status[pairID].moving = true;
    if (changeSide==1) {
        operations_status[pairID].movingChangeSide = true;
    }
    operations_status[pairID].state="closing";
    let qty = operations_status[pairID].executedQty

    if (operations_status[pairID].side=="long") {
        anotherOrder(pairID,"sell","market", qty, 0, "long");
    } else if (operations_status[pairID].side=="short") {
        anotherOrder(pairID,"buy","market", qty, 0, "short");
    }  
    
    

}

const stopLossTriger = async (pairID) => {
    logger.info("Activado stopLoss para le par " + okex.pairs[pairID]);
    if (privateChannelUp && operations_status[pairID].side!="none" && operations_status[pairID].state=="none"){
        operations_status[pairID].state="stopLossTriger";
        okex.cancelOrder(okex.instId[pairID], operations_status[pairID].orderId)
        .then(answer =>{
            if (answer!="error" && answer.code!=null && answer.code=="0") {
                changeOpToLimbo(pairID);
            } else {
                logger.info("Error al cancelar la operacion.");
            }
        }) 
    } else {
        logger.info("No hemos podido completar el proceso de Stoploss");
    }
}

const changeOpToLimbo = async (pairID) => {
    
    operations_status[pairID].movingToPair = "limbo";
    operations_status[pairID].moving = true;
    operations_status[pairID].state="closing";
    let qty = operations_status[pairID].executedQty

    if (operations_status[pairID].side=="long") {
        anotherOrder(pairID,"sell","market", qty, 0, "long");
    } else if (operations_status[pairID].side=="short") {
        anotherOrder(pairID,"buy","market", qty, 0, "short");
    } 
}

const getMovingAverages = async (bar) => {
    for (let pairID=0;pairID<okex.pairs.length;pairID++){
        if (okex.pairs[pairID].includes("USDT")){
            let candles = await okex.getCandles(okex.instId[pairID],bar);
            if (candles[0]!=null && candles[0][4]!=null){
                
                let ma20 = new Big (0);
                let ma99 = new Big(0);
                let averageVolume = new Big(0);
                if (candles.length<100){
                    operations_status[pairID].sideInfo = "none";
                } else {
                    let time = null;
                    let lastTime = null;
                    for (let i=0;i<candles.length;i++) {
                        if (lastTime==null) lastTime = candles[i][0];
                        else lastTime = time;
                        time = candles[i][0];
                        // if (lastTime<(time)) logger.info("de mas viejo a mas nuevo") 
                        // else logger.info("de mas nuevo a mas viejo") 
                        let high = new Big(candles[i][2]);
                        let low = new Big(candles[i][3]);
                        let halfWay = (high.plus(low)).div(2)
                        let vol = new Big(candles[i][6]).times(halfWay);
                        averageVolume = averageVolume.plus(vol);
                        let closePrice = new Big(candles[i][4])
                        if (i<20) ma20 = ma20.plus(closePrice)
                        if (i<99) ma99 = ma99.plus(closePrice)
                        if (i==20) ma20 = ma20.div(i);
                        if (i==99) ma99 = ma99.div(i);  
                    }
                    averageVolume = averageVolume.div(candles.length);
                    operations_status[pairID].ma20 = ma20;
                    operations_status[pairID].averageVolume = averageVolume;
                  
                    
                }
            }
            
            
        }
        
    }
}

const connectUserDataStream = async () => {             
    clientokex.connect("wss://wsaws.okx.com:8443/ws/v5/private");
}

const loginUserDataStream = (connection) => {
    let timeAux = new Date().getTime()/1000;
    let params = timeAux+"GET"+"/users/self/verify";
    var sKey = crypto.createHmac("sha256", okex.secret).update(params).digest();
    let b64 = sKey.toString("base64");
    let param = {
        "op": "login",
        "args": [
          {
            "apiKey": okex.key,
            "passphrase": okex.passPhrase,
            "timestamp": timeAux,
            "sign": b64
          }
        ]
    }
    connection.sendUTF(JSON.stringify(param)); 
    privateChannelUp = true;
}

const subcribeUserDataStream = (connection) => {
    // let args = [];
    // for (let pairID=0;pairID<okex.pairs.length;pairID++){
    //     if (okex.pairs[pairID].includes("USDT")){
    //         let aux = {
    //             "channel": "orders",
    //             "instType": "SWAP",
    //             "uly": okex.pairs[pairID],
    //             "instId": okex.instId[pairID]
    //         }
    //         args.push(aux);
    //     }
    // }
    // let param = {
    //     "op": "subscribe",
    //     "args": args
    // }
    let param = {
        "op": "subscribe",
        "args": [
          {
            "channel": "orders",
            "instType": "SWAP",
          }
        ]
      }
    connection.sendUTF(JSON.stringify(param)); 
}

const connectKindleStream =  () => {
//   clientokexKindles.connect("wss://wsaws.okx.com:8443/ws/v5/public");
  clientokexKindles.connect("ws://localhost:8080/name");
}

const subscribeKindleStream = async (connection) => {
    // let args = [];
    // for (let pairID=0;pairID<okex.pairs.length;pairID++){
    //     if (okex.pairs[pairID].includes("USDT")){
    //         let aux = {
    //             "channel": "candle15m",
    //             "instId": okex.pairs[pairID]+"-SWAP"
    //         }
    //         args.push(aux);
    //     }
    // }
    // let param = {
    //     "op": "subscribe",
    //     "args": args
    // }
    //connection.sendUTF(JSON.stringify(param));
}

const getOpenPositions = async (positions) => {
    return new Promise(async resolve => {
        logger.info("Comprobamos las operaciones abiertas");
        let orders = await okex.getOpenOrders();
        if (orders=="error") process.exit(0);
        let operationsAux = null;
        let operationsPauseAux = [];
        let status = null
        if (fs.existsSync("./fridge.json")) {
            let data = fs.readFileSync("./fridge.json", 'utf8' )
            operationsPauseAux = JSON.parse(data);
        }
        if (fs.existsSync("./operations.json")) {
            let data = fs.readFileSync("./operations.json", 'utf8')
            operationsAux = JSON.parse(data);
        }
        if (fs.existsSync("./status.json")) {
            let data = fs.readFileSync("./status.json", 'utf8')
            status = JSON.parse(data);
            stop = status.stop;
            stopOpening = status.stopOpening;
        }
        if (fs.existsSync("./limbo.json")) {
            let data = fs.readFileSync("./limbo.json", 'utf8')
            limbo = JSON.parse(data);
        }
        for (let i=0;i<positions.length;i++){
            let qty = parseFloat(positions[i].positionAmt)
            let isSomethingOnFridge = false
            if (qty!="0") {
                let pairID = okex.pairs.indexOf(positions[i].symbol);
                let auxPairID = pairID;
                let execPriceMissing = false;
                for (let j=0;j<operationsAux.length;j++){
                    if (operationsAux[j].pair==positions[i].symbol) {
                        auxPairID=j;
                    }
                    let pID = okex.pairs.indexOf(operationsAux[j].pair);
                    if (pID!=-1) {
                        if (operationsAux[j].stopOperating!=null) operations_status[pID].stopOperating = operationsAux[j].stopOperating;
                        if (operationsAux[j].invisible!=null)  operations_status[pID].invisible = operationsAux[j].invisible;
                        if (operationsAux[j].takeProfit!=null) operations_status[pID].takeProfit = operationsAux[j].takeProfit;
                        if (operationsAux[j].stopLoss!=null) operations_status[pID].stopLoss = operationsAux[j].stopLoss;
                    }
                    
                }
                //logger.info("Par " +  positions[i].symbol + " id " + pairID);
                for (let j = 0;j<operationsPauseAux.length;j++){
                    let qtyAux = new Big(qty).times(okex.ctVal[pairID])
                    
                    if (operationsPauseAux!=null && operationsPauseAux[j]!=null && operationsPauseAux[j].simbol==positions[i].symbol && qtyAux!=parseFloat(operationsPauseAux[j].executedQty)) {
                        
                        logger.info("Tenemos al par "  + positions[i].symbol + " en la nevera");
                        isSomethingOnFridge = true;
                        //if (auxPairID!=j) auxPairID=j;
                        let spare = {
                            "simbol" : okex.pairs[pairID],
                            "execPrice" : new Big(operationsPauseAux[j].execPrice),
                            "executedQty" : new Big(operationsPauseAux[j].executedQty),
                            "cummulativeQty" : new Big(operationsPauseAux[j].cummulativeQty),
                            "lastExecPrice" : new Big(operationsPauseAux[j].lastExecPrice)
                        }
                        operations_status_pause[pairID] = spare;
                        operations_status[pairID].isMoreOnFridger = true;
                        if (operationsAux[j].timesDivideAndConquer!=null) operations_status[pairID].timesDivideAndConquer = operationsAux[auxPairID].timesDivideAndConquer;
                        else operations_status[pairID].timesDivideAndConquer = 1;
                        
                    }
                }
                if (positions[i].posSide=="long") {
                    operations_status[pairID].side = "long";
                    //let totalCummAux = new Big(positions[i].entryPrice).times(qty).times(okex.ctVal[pairID])
                    if (!isSomethingOnFridge){
                        // logger.info("No nevera execPrice: " + positions[i].entryPrice )
                        let executedPriceAux = new Big(positions[i].entryPrice);
                        if (executedPriceAux.lt(operationsAux[auxPairID].executedPrice)) executedPriceAux = new Big(operationsAux[auxPairID].executedPrice)
                        if (operationsAux!=null && operationsAux[auxPairID]!=null && operationsAux[auxPairID].comesFromFridger) {
                            logger.info("Es una operacion que viene de la nevera")
                            if (executedPriceAux>(new Big(operationsAux[auxPairID].executedPrice).times(100))) {
                                logger.info("tenemos mal el precio en el JSON")
                                //execPriceMissing = true;
                            } else if (executedPriceAux<(new Big(operationsAux[auxPairID].executedPrice).div(100))) {
                                logger.info("tenemos mal el precio en el JSON")
                                //execPriceMissing = true;
                            } else executedPriceAux = new Big(operationsAux[auxPairID].executedPrice)
                            operations_status[pairID].comesFromFridger = true;
                        }
                        
                        operations_status[pairID].executedPrice = executedPriceAux;
                        operations_status[pairID].executedQty = new Big(qty).times(okex.ctVal[pairID]);
                        operations_status[pairID].partialQty = new Big(qty).times(okex.ctVal[pairID]);
                        operations_status[pairID].cummulativeQty =  operations_status[pairID].executedPrice.times(operations_status[pairID].executedQty);
                        operations_status[pairID].lastExecPrice = operations_status[pairID].executedPrice;
                        
                        // logger.info("ExecPrice: " + operations_status[pairID].executedPrice + " ExecQty: " + operations_status[pairID].executedQty + " CummQty: " + operations_status[pairID].cummulativeQty)
                        
                    } else {
                        // logger.info("Hay nevera execPrice: " + positions[i].entryPrice )
                        let qtyAux = new Big(qty).times(okex.ctVal[pairID]).minus(operations_status_pause[pairID].executedQty);
                        operations_status[pairID].executedPrice = new Big(operationsAux[auxPairID].executedPrice);
                        operations_status[pairID].isMoreOnFridger = true;
                        if (qtyAux == 0) {
                            logger.info("Solo queda lo de la nevera")
                            qtyAux = new Big(qty).times(okex.ctVal[pairID])
                            operations_status[pairID].executedPrice = new Big(operations_status_pause[pairID].executedPrice);
                            operations_status[pairID].isMoreOnFridger = false;
                            operations_status[pairID].comesFromFridger=true
                        }
                        operations_status[pairID].executedQty = qtyAux;
                        operations_status[pairID].partialQty = qtyAux;
                        operations_status[pairID].cummulativeQty =  operations_status[pairID].executedPrice.times(operations_status[pairID].executedQty);
                        operations_status[pairID].lastExecPrice = new Big(operationsAux[auxPairID].executedPrice);
                        
                        moneyInFridger = moneyInFridger.plus(operations_status_pause[pairID].cummulativeQty);
                        // logger.info("ExecPrice: " + operations_status[pairID].executedPrice + " ExecQty: " + operations_status[pairID].executedQty + " CummQty: " + operations_status[pairID].cummulativeQty)

                    }
                    let totalCummAux =operations_status[pairID].cummulativeQty
                    if (isSomethingOnFridge) totalCummAux = totalCummAux.plus(operations_status_pause[pairID].cummulativeQty);
                    if (operationsAux[auxPairID].timesMoving!=null) operations_status[pairID].timesMoving = operationsAux[auxPairID].timesMoving
                    operations_status[pairID].lastExecTime = Date.now();
                    operations_status[pairID].level = 0;
                    operations_status[pairID].leverage = positions[i].lever;
                    operations_status[pairID].startAmount = operations_status[pairID].cummulativeQty;
                    // totalCumm = totalCumm.plus(totalCummAux);
                    realOpsStartAmount = realOpsStartAmount.plus(operations_status[pairID].cummulativeQty);
                    numOpsLong++;
                    openOperations++;
                }
                if (positions[i].posSide=="short") {
                    //qty = qty*(-1);
                    operations_status[pairID].side = "short";
                    //let totalCummAux = new Big(positions[i].entryPrice).times(qty).times(okex.ctVal[pairID])
                    if (!isSomethingOnFridge){
                        let executedPriceAux = new Big(positions[i].entryPrice);
                        if (executedPriceAux.gt(operationsAux[auxPairID].executedPrice)) executedPriceAux = new Big(operationsAux[auxPairID].executedPrice);
                        if (operationsAux!=null && operationsAux[auxPairID]!=null && operationsAux[auxPairID].comesFromFridger) {
                            executedPriceAux = new Big(operationsAux[auxPairID].executedPrice)
                            operations_status[pairID].comesFromFridger = true;
                        }
                        operations_status[pairID].executedPrice = executedPriceAux;
                        operations_status[pairID].executedQty = new Big(qty).times(okex.ctVal[pairID]);
                        operations_status[pairID].partialQty = new Big(qty).times(okex.ctVal[pairID]);
                        operations_status[pairID].cummulativeQty =  operations_status[pairID].executedPrice.times(operations_status[pairID].executedQty);
                        operations_status[pairID].lastExecPrice = operations_status[pairID].executedPrice;
                    } else {
                        let qtyAux = new Big(qty).times(okex.ctVal[pairID]).minus(operations_status_pause[pairID].executedQty);
                        operations_status[pairID].executedPrice = new Big(operationsAux[auxPairID].executedPrice);
                        operations_status[pairID].executedQty = qtyAux;
                        operations_status[pairID].partialQty = qtyAux;
                        operations_status[pairID].cummulativeQty =  operations_status[pairID].executedPrice.times(operations_status[pairID].executedQty);
                        operations_status[pairID].lastExecPrice = new Big(operationsAux[auxPairID].executedPrice);
                        operations_status[pairID].isMoreOnFridger = true;
                        moneyInFridger = moneyInFridger.plus(operations_status_pause[pairID].cummulativeQty);
                    }
                    let totalCummAux =operations_status[pairID].cummulativeQty
                    if (isSomethingOnFridge) totalCummAux = totalCummAux.plus(operations_status_pause[pairID].cummulativeQty);
                    
                    if (operationsAux[auxPairID].timesMoving!=null) operations_status[pairID].timesMoving = operationsAux[auxPairID].timesMoving
                    operations_status[pairID].lastExecTime = Date.now();
                    operations_status[pairID].level = 0;
                    operations_status[pairID].leverage = positions[i].lever;
                    operations_status[pairID].startAmount = operations_status[pairID].cummulativeQty;
                    // totalCumm = totalCumm.plus(totalCummAux);
                    realOpsStartAmount = realOpsStartAmount.plus(operations_status[pairID].cummulativeQty);
                    numOpsShort++;
                    openOperations++;
                }
                
                
                logger.info("Par " + positions[i].symbol + " Side: " + operations_status[pairID].side +  " Cantidad: " + operations_status[pairID].executedQty + " Cummulative: " + operations_status[pairID].cummulativeQty + " execPrice: " + operations_status[pairID].executedPrice)
                
                if (operations_status[pairID].cummulativeQty==0) {
                    logger.info("Error al obtener la informacion del dinero en USDT de par. No podemos continuar")
                    await sleep(2000);
                    process.exit();
                }
                let found = false;
                for (let z=0;z<orders.length;z++) {
                    if (orders[z].symbol==positions[i].symbol) {
                        operations_status[pairID].orderId=orders[z].orderId;
                        if (orders[z].qty!=operations_status[pairID].executedQty.div(okex.ctVal[pairID])) {
                            logger.info("No coinciden las cantidades. Problema!!! ************************************************************************************")
                            logger.info("Order: " + orders[z].qty + "  ExecutedQty: " + operations_status[pairID].executedQty + " ctVal: " + okex.ctVal[pairID])
                        }
                        logger.info("execPriceMissing: " + execPriceMissing);
                        if (execPriceMissing) {
                            let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                            multAux = multAux.plus(1.01);
                            if (operations_status[pairID].side=="long") operations_status[pairID].executedPrice = new Big(orders[z].pice).div(multAux)
                            multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                            multAux = new Big(0.99).minus(multAux);
                            if (operations_status[pairID].side=="short") operations_status[pairID].executedPrice = new Big(orders[z].pice).div(multAux)
                        }
                        found=true;
                        break;
                    }
                }
                if (found) {
                    logger.info("Encontrada orden de cierre. Todo OK");
                } else {
                    logger.info("Falta orden de cierre");
                    if (operations_status[pairID].side == "long") {
                        let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                        multAux = multAux.plus(1.01);
                        let closePrice = operations_status[pairID].executedPrice.times(multAux);
                        checkPrice(closePrice,pairID)
                            .then(closePrice => {
                                okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                                    .then(answer => {
                                        if (answer=="error"){
                                            operations_status[pairID].state="noClosingOrder";
                                            operations_status[pairID].state="none";
                                        } else {
                                            operations_status[pairID].state="none";
                                            operations_status[pairID].orderId=answer;
                                            logger.info("Puesta orden de cierre");
                                        }
                                    })
                            })
                    } else if (operations_status[pairID].side == "short") {
                        let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                        multAux = new Big(0.99).minus(multAux);
                        let closePrice = operations_status[pairID].executedPrice.times(multAux);
                        checkPrice(closePrice,pairID)
                            .then(closePrice => {
                                okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                                    .then(answer => {
                                        if (answer=="error"){
                                            operations_status[pairID].state="noClosingOrder";
                                            operations_status[pairID].state="none";
                                        } else {
                                            operations_status[pairID].state="none";
                                            operations_status[pairID].orderId=answer;
                                            logger.info("Puesta orden de cierre");
                                        }
                                    }) 
                            })
                    }
                }
            }
        } 
        let auxStartAmount = realOpsStartAmountLimit.div(2);
        if (totalCumm.gt(auxStartAmount)) {
            let multiplier = auxStartAmount.div(totalCumm);
            realOpsStartAmount = new Big(0);
            for (let pairID=0;pairID<okex.pairs.length;pairID++) {
                if (operations_status[pairID].side!="none") {
                    let aux = operations_status[pairID].cummulativeQty.times(multiplier);
                    operations_status[pairID].startAmount = aux;
                    realOpsStartAmount = realOpsStartAmount.plus(aux);
                }
            }
        }
        if (operationsAux!=null) {
            for (let pairID=0;pairID<okex.pairs.length;pairID++){
                for (let j=0;j<operationsAux.length;j++){
                    if (operationsAux[j].pair==operations_status[pairID].symbol) {
                        operations_status[pairID].stopOperating=operationsAux[j].stopOperating;
                    }
                }
            }
        }
 
        logger.info("Salimos de openPositions");
        resolve(true)
    });
}

const checkOrderMissing = async (pairID) => {
    
    logger.info("Comprobamos si falta orden de cierre");
    let positions = await okex.getPositionInfo()
    let orders = await okex.getOpenOrders();

    
    for (let i=0;i<positions.length;i++){
        if (okex.pairs[pairID]==positions[i].symbol){
            let found = false;
            for (let z=0;z<orders.length;z++) {
                if (okex.pairs[pairID]==orders[z].symbol) {
                    found=true;
                    logger.info("Encotrada orden de cierre. Estaba todo OK");
                    operations_status[pairID].orderId=orders[z].orderId;
                    operations_status[pairID].marketOpTimestamp = null;
                    operations_status[pairID].state = "none"
                    break;
                }
            } 
            if (found) {
                break;
            }
            else {
                logger.info("Falta orden de cierre");
                let qty = parseFloat(positions[i].positionAmt);
                let qtyAuxTot = new Big(qty).times(okex.ctVal[pairID]);
                let executedPriceAux = new Big(positions[i].entryPrice);
                if (operations_status[pairID].isMoreOnFridger && operations_status_pause[pairID]!=null) {
                    let qtyAuxExec = qtyAuxTot.minus(operations_status_pause[pairID].executedQty);
                    if (qtyAuxExec != operations_status[pairID].executedQty) {
                        operations_status[pairID].executedQty = qtyAuxExec;
                        let totCummAux = qtyAuxTot.times(executedPriceAux);
                        let activeCumm = totCummAux.minus(operations_status_pause[pairID].cummulativeQty);
                        operations_status[pairID].executedPrice = activeCumm.div(operations_status[pairID].executedQty);
                        operations_status[pairID].cummulativeQty = activeCumm;
                    } 
                } else {
                    let updateCummulative = false;
                    if (qtyAuxTot != operations_status[pairID].executedQty) {
                        operations_status[pairID].executedQty = qtyAuxTot;
                        updateCummulative = true;
                    }
                    if (executedPriceAux != operations_status[pairID].executedPrice) {
                        operations_status[pairID].executedPrice = executedPriceAux;
                        updateCummulative = true;
                    }
                    if (updateCummulative) operations_status[pairID].cummulativeQty = operations_status[pairID].executedPrice.times(operations_status[pairID].executedQty);
                }
                if (operations_status[pairID].side == "long" || (operations_status[pairID].side == "none" && operations_status[pairID].state == "starting")) {
                    let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                    multAux = multAux.plus(1.01);
                    let closePrice = operations_status[pairID].executedPrice.times(multAux);
                    checkPrice(closePrice,pairID)
                        .then(closePrice => {
                            okex.placeOrder(okex.instId[pairID], "limit", "sell", "long", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                                .then(answer => {
                                    if (answer=="error"){
                                        operations_status[pairID].state="noClosingOrder";
                                        operations_status[pairID].state="none";
                                        logger.info("Error al poner orden de cierre");
                                    } else {
                                        operations_status[pairID].state="none";
                                        operations_status[pairID].orderId=answer;
                                        logger.info("Puesta orden de cierre");
                                    }
                                })
                        })
                } else if (operations_status[pairID].side == "short") {
                    let multAux = new Big(0.0007).times(operations_status[pairID].timesMoving)
                    multAux = new Big(0.99).minus(multAux);
                    let closePrice = operations_status[pairID].executedPrice.times(multAux);
                    checkPrice(closePrice,pairID)
                        .then(closePrice => {
                            okex.placeOrder(okex.instId[pairID], "limit", "buy", "short", closePrice, operations_status[pairID].executedQty.div(okex.ctVal[pairID]))
                                .then(answer => {
                                    if (answer=="error"){
                                        operations_status[pairID].state="noClosingOrder";
                                        operations_status[pairID].state="none";
                                    } else {
                                        operations_status[pairID].state="none";
                                        operations_status[pairID].orderId=answer;
                                        logger.info("Puesta orden de cierre");
                                    }
                                }) 
                        })
                }

            }
        }
    } 

    logger.info("Salimos de comprobar si falta orden de cierre");
        
    checkingOrderMissing[pairID]=false;
}

const sleep = (millis) => {
    return new Promise(resolve => setTimeout(resolve, millis));
}

const updateVariables = async () => {
    return new Promise(async resolve => {
        let accountInfo = null;
        if (!test) {
            accountInfo = await okex.getAccountInfo();
            if (accountInfo!="error"){
                let usdtCheck = false;
                for (let i = 0; i<accountInfo.length; i++){
                    if (accountInfo[i].ccy == "USDT") {
                        usdtAvaliable = new Big(accountInfo[i].availEq);
                        usdtCheck= true;
                    }
                   
                    if (usdtCheck) break;
                }
                posibleInvest = usdtAvaliable.times(10);  
                limitInvestment = usdtAvaliable.times(limitInvestmentMultiplier); 
                limitInvestmentPerPair = usdtAvaliable.times(limitInvestmentMultiplierPerPair);
                realOpsStartAmountLimit = usdtAvaliable.times(startAmountLimitMultiplier);
                amountToStopOperatingAllPairs = usdtAvaliable.times(amountToStopOperatingAllPairsMultiplier);
                amountToStartRealOp = new Big(300);
                maxOpenPairs = parseFloat(process.env.maxOpenPairs);
            }   
        } else {
            usdtAvaliable = new Big(process.env.startAmount).plus(closedProfit).plus(pnl)
            if (usdtAvaliable.lt(0)) process.exit(0);
            posibleInvest = usdtAvaliable.times(10);  
            limitInvestment = usdtAvaliable.times(limitInvestmentMultiplier); 
            limitInvestmentPerPair = usdtAvaliable.times(limitInvestmentMultiplierPerPair);
            realOpsStartAmountLimit = usdtAvaliable.times(startAmountLimitMultiplier);
            amountToStopOperatingAllPairs = usdtAvaliable.times(amountToStopOperatingAllPairsMultiplier);
            amountToStartRealOp = new Big(300);
            maxOpenPairs = parseFloat(process.env.maxOpenPairs);
            accountInfo = {
                positions: []
            }
            realCash = new Big(process.env.startAmount).plus(closedProfit);
            // minInitialBet = new Big(process.env.startAmount).div(2000).times(75);
            minInitialBet = new Big(process.env.initialBet)
            // let minInitialBetAux = realCash.div(2000).times(75);
            // if (minInitialBet.lt(minInitialBetAux)) minInitialBet = minInitialBetAux;
        }
        
        resolve("OK");
    })    
}

const getSimulationInfo = () => {
    return new Promise (resolve => {
        axios.get('http://52.199.91.213:8002/getSimulationInfo', {})
        .then((response)=>{
            logger.info("Tenemos la información del simulador")
            let operations_status_long_aux = response.data.long
            let operations_status_short_aux = response.data.short
            ready4RealLongOps = 0;
            ready4RealShortOps = 0;
            for (let pairID=0;pairID<operations_status_long_aux.length;pairID++) {
                let newPairID = okex.pairs.indexOf(response.data.long[pairID].pair)
                //logger.info("Par " + response.data.long[pairID].pair + " Nuevo id " + newPairID + " viejo id " + pairID)
                operations_status_long[newPairID] = operations_status_long_aux[pairID];
                operations_status_short[newPairID] = operations_status_short_aux[pairID];
                operations_status_long[newPairID].pairID = newPairID;
                operations_status_short[newPairID].pairID = newPairID;
                operations_status_long[newPairID].executedPrice = new Big(response.data.long[pairID].executedPrice);
                operations_status_long[newPairID].cummulativeQty = new Big(response.data.long[pairID].cummulativeQty);
                operations_status_long[newPairID].executedQty = new Big(response.data.long[pairID].executedQty);
                operations_status_long[newPairID].lastExecPrice = new Big(response.data.long[pairID].lastExecPrice);
                operations_status_long[newPairID].profit = new Big(response.data.long[pairID].profit);
                operations_status_long[newPairID].levelUpLastTryValue = new Big(response.data.long[pairID].levelUpLastTryValue);
                operations_status_short[newPairID].executedPrice = new Big(response.data.short[pairID].executedPrice);
                operations_status_short[newPairID].cummulativeQty = new Big(response.data.short[pairID].cummulativeQty);
                operations_status_short[newPairID].executedQty = new Big(response.data.short[pairID].executedQty);
                operations_status_short[newPairID].lastExecPrice = new Big(response.data.short[pairID].lastExecPrice);
                operations_status_short[newPairID].profit = new Big(response.data.short[pairID].profit);
                operations_status_short[newPairID].levelUpLastTryValue = new Big(response.data.short[pairID].levelUpLastTryValue);
                if (operations_status_long[newPairID].side!="none") simulatingLongPairs++;
                if (operations_status_short[newPairID].side!="none") simulatingShortPairs++;
                if (operations_status_long[newPairID].side=="none") operations_status_long[newPairID].cummulativeQty=new Big(0);
                if (operations_status_short[newPairID].side=="none") operations_status_short[newPairID].cummulativeQty=new Big(0);
                operations_status_long[newPairID].ready4Real = false;
                operations_status_short[newPairID].ready4Real = false;
                if (operations_status_long[newPairID].side!="none" && operations_status_long[newPairID].cummulativeQty.gte(amountToStartRealOp)) {
                    operations_status_long[newPairID].ready4Real = true;
                    ready4RealLongOps++;
                }
                if (operations_status_short[newPairID].side!="none" && operations_status_short[newPairID].cummulativeQty.gte(amountToStartRealOp) && operations_status_short[newPairID].cummulativeQty.gt(amountToStartRealOpShort)) {
                    operations_status_short[newPairID].ready4Real = true;
                    ready4RealShortOps++;
                }
            }
            logger.info("Finalizado proceso de recuperar datos de simulacion")
            resolve(true);
        })
        .catch ((error)=>{
            logger.error(" Error: " + error);
            resolve(false);
        }) 
    })
}

const start = async () => {
    let answer = await okex.getExchangeInfo();
    //console.log(JSON.stringify(answer,null,2))
    if (answer=="OK") {
        logger.info(" Obtenida informacion de los pares de futuros");
        let ok = true;
        if (!test) {
            connectUserDataStream();
            await sleep(5000);
        }
        if (ok) {
            privateChannelUp = true;
            for (var i=0; i<okex.pairs.length; i++){
                let pair = okex.pairs[i];
                operations_status[i]="ready";
                checking[i] = false;
                lastKindleSize[i] = 0;
                actualKindleSize[i] = 0;
                biggerKindleSize[i] = 0;
                minValuesOneMin[i] = 0;
                maxValuesOneMin[i] = 0;
                minValuesFiveMin[i] = 0;
                maxValuesFiveMin[i] = 0;
                oneMinTimeStamp[i] = 0;
                fiveMinTimeStamp[i] = 0;
                candlesLow[i] = 0;
                candlesHigh[i] = 0;
                greenCandles[i] = 0;
                redCandles[i] = 0;
                kindleCounter[i] = 0;
                checkingOrderMissing[i]=false;
                operations[i] = [];
                levelsTimeStamp[i] = [];
                values[i]=[];
                actions[i] = [];
                averages[i] = [];
                ma5[i] = [];
                ma5Values[i] = [];
                volumes[i] = new Big(0);
                firstOp[i] = true;
                let operation  = {
                    pair : pair,
                    pairID : i,
                    executedPrice : 0,
                    executedQty : 0,
                    partialQty : 0,
                    cummulativeQty : 0,
                    realCummulativeQty : new Big(0),
                    profit: new Big(0),
                    maxPNL : new Big(0),
                    maxInvest : new Big(0),
                    partialProfit: new Big(0),
                    comission: new Big(0),
                    side: "none",
                    priceToCheckStandByLong: 0,
                    priceToCheckStandByShort: 0,
                    timeStampPriceToCheckStandByLong: 0,
                    timeStampPriceToCheckStandByShort: 0,
                    minValue: 0,
                    timeStampMinValue: 0,
                    numberTimesInStandBy: 0,
                    lastTimeStandBy : 0,
                    closeValue : 0,
                    partialProfitFridge: new Big(0),
                    multiplier : 1,
                    readyLong : false,
                    readyShort : false,
                    readyPrice : new Big(0),
                    minFromReady : new Big(0),
                    lastExecPrice : new Big(0),
                    lastExecTime : new Big(0),
                    level: 0,
                    pnl: 0,
                    movement: 0,
                    stop: false,
                    stopOperating :false,
                    state: "none",
                    lastTry : null,
                    levelUpCount : 0,
                    levelUpLastTryValue : new Big(0),
                    levelUpLastTryTimestamp : null,
                    missingCloserOrderLastTryTimestamp : null,
                    leverage : 10,
                    startAmount : new Big(0),
                    moneyNeeded : new Big(0),
                    distance : new Big(0),
                    limitOperations :false,
                    numberOfPositions: 0,
                    moreOrders : false,
                    moreOrdersPrice : new Big(0),
                    moreOrdersQty : new Big(0),
                    moreOrdersRemain : new Big(0),
                    isMoreOnFridger : false,
                    needToSaveInfo : false,
                    comesFromFridger : false,
                    lastKindleGenerationTime : null,
                    orderId : null,
                    marketOpTimestamp : null,
                    timesDivideAndConquer : 0,
                    earlyEntry : false,
                    forceNextLevelAt : null,
                    forceOpenAt : null,
                    forceOpenAtQty : null,
                    moving: false,
                    movingToPair: null,
                    movingChangeSide: false,
                    movingLoose: null,
                    timesMoving: 0,
                    stopLoss : null,
                    takeProfit : false,
                    sideInfo : "none",
                    ma20 : null,
                    ma200 : null,
                    lastMa20 : null,
                    lastMa200 : null,
                    lastCross : null,
                    ma200Ternd : "none",
                    ma20Side : null,
                    invisible : false,
                    averageVolume : new Big(0)
                }
                operations_status[i] = operation;
   
                    
            }
            logger.info("inicializamos el array de operaciones.");
            // await getSimulationInfo();
            await updateVariables();
            
            if (!test) {
                let positions = await okex.getPositionInfo()
                await getOpenPositions(positions);
            }
            // setInterval( async ()=>{
            //     let pos = await updateVariables();
            // },300000)
            connectKindleStream();
            // cron.schedule('1,16,31,46 * * * *', () => {
                //  getMovingAverages("15m");
            // })
            // getMovingAverages("15m");
            // execSimulation("C:/Users/Alberto/Downloads/test.csv")
        } 
        
                    
    } else {
        logger.info(answer);
        exit(0);
    }
   
}

start();






















        






















