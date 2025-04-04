const now = new Intl.DateTimeFormat("ko-KR", {weekday:'short', hour:"numeric",minute:"numeric", hour12:false }).format(new Date())
const weekday = now[1]
const hour = +now.substring(4,6)*60
const minute = +now.substring(7,9)
const time = hour+minute

console.log(weekday)
console.log(hour)
console.log(minute)
console.log(time)