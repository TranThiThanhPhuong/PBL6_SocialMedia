import moment from "moment";
import "moment/locale/vi";

moment.locale("vi");

export function formatPostTime(createdAt) {
  if (!createdAt) return "";

  const now = moment();
  const time = moment(createdAt);
  const diffMinutes = now.diff(time, "minutes");
  const diffHours = now.diff(time, "hours");
  const diffDays = now.diff(time, "days");
  const diffYears = now.diff(time, "years");

  if (diffMinutes < 60) {
    return `${diffMinutes} phút`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ`;
  } else if (diffDays < 7) {
    return `${diffDays} ngày`;
  } else if (diffYears < 1) {
    return time.format("D [Tháng] M [lúc] HH:mm");
  } else {
    return time.format("D [Tháng] M, YYYY");
  }
}